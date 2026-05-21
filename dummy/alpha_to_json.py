import cv2
import json
import numpy as np
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms


# =========================
# 경로 설정
# =========================

IMAGE_PATH = "input.jpg"
INPUT_JSON_PATH = "worldmap.json"
OUTPUT_JSON_PATH = "worldmap.json"

MODEL_PATH = "emnist_letters_cnn.pth"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


# =========================
# EMNIST 모델 구조
# train_emnist_letters.py에서 썼던 구조와 같아야 함
# =========================

class LetterCNN(nn.Module):
    def __init__(self):
        super().__init__()

        self.features = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),  # 28 -> 14

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),  # 14 -> 7
        )

        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 7 * 7, 128),
            nn.ReLU(),
            nn.Linear(128, 26)  # A~Z
        )

    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x


def load_model():
    """
    학습된 emnist_letters_cnn.pth 모델을 불러온다.
    """
    model = LetterCNN().to(DEVICE)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model.eval()
    return model


def index_to_char(index):
    """
    모델 출력 index를 알파벳으로 변환.
    0 -> A
    1 -> B
    ...
    4 -> E
    5 -> F
    """
    return chr(ord("A") + index)


# EMNIST 모델 입력용 transform
emnist_transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=1),
    transforms.Resize((28, 28)),
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])


# =========================
# JSON 관련 함수
# =========================

def load_map_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(data, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# =========================
# 좌표 변환 함수
# =========================

def pixel_to_tile(px, py, image_w, image_h, map_w, map_h):
    """
    이미지 픽셀 좌표를 타일맵 좌표로 변환한다.

    이미지 기준:
      왼쪽 위 = (0, 0)
      오른쪽 아래 = (image_w, image_h)

    타일맵 기준:
      왼쪽 위 = (0, 0)
      오른쪽 아래 = (map_w - 1, map_h - 1)
    """

    tile_x = int(px / image_w * map_w)
    tile_y = int(py / image_h * map_h)

    # 범위 안전 처리
    tile_x = max(0, min(map_w - 1, tile_x))
    tile_y = max(0, min(map_h - 1, tile_y))

    return tile_x, tile_y


# =========================
# 문자 위치 검출 함수
# =========================

def find_character_regions(image):
    """
    이미지에서 검은색 문자 영역을 찾는다.
    반환값: [(x, y, w, h), ...]
    """

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # 검은 선을 흰색으로 반전해서 검출하기 쉽게 만듦
    _, binary = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )

    # 끊어진 선을 이어 붙임
    # 문자가 여러 조각으로 나뉘면 숫자를 키우고,
    # 여러 문자가 서로 붙으면 숫자를 줄이면 됨
    kernel = np.ones((15, 15), np.uint8)
    merged = cv2.dilate(binary, kernel, iterations=1)

    contours, _ = cv2.findContours(
        merged,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    regions = []

    image_h, image_w = image.shape[:2]

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)

        area = w * h

        # 너무 작은 노이즈 제거
        if area < 100:
            continue

        # 이미지 전체를 잡는 이상한 박스 방지
        if w > image_w * 0.9 or h > image_h * 0.9:
            continue

        regions.append((x, y, w, h))

    # 왼쪽 위부터 순서대로 정렬
    regions.sort(key=lambda r: (r[1], r[0]))

    return regions


# =========================
# crop 전처리 함수
# =========================

def preprocess_crop_for_emnist(crop):
    """
    OpenCV crop 이미지를 EMNIST 모델 입력 형태로 바꾼다.
    핵심:
      - 글자 부분만 다시 crop
      - 비율 유지
      - 검은 배경 + 흰 글자로 반전
      - 28x28 입력
    """

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

    # 현재 이미지: 흰 배경 + 검은 글자
    _, binary = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    # 검은 글자 픽셀 위치 찾기
    ys, xs = np.where(binary < 128)

    if len(xs) == 0 or len(ys) == 0:
        empty = np.zeros((28, 28), dtype=np.uint8)
        pil_img = Image.fromarray(empty)
        tensor = emnist_transform(pil_img)
        return tensor.unsqueeze(0)

    # 글자 영역만 crop
    x1, x2 = xs.min(), xs.max()
    y1, y2 = ys.min(), ys.max()
    char_img = binary[y1:y2 + 1, x1:x2 + 1]

    h, w = char_img.shape[:2]

    # 정사각형 캔버스에 중앙 배치
    size = max(w, h)
    canvas = np.ones((size, size), dtype=np.uint8) * 255

    offset_x = (size - w) // 2
    offset_y = (size - h) // 2

    canvas[offset_y:offset_y + h, offset_x:offset_x + w] = char_img

    # 여백 추가
    pad = size // 4
    canvas = cv2.copyMakeBorder(
        canvas,
        pad, pad, pad, pad,
        cv2.BORDER_CONSTANT,
        value=255
    )

    # 핵심: EMNIST 스타일로 반전
    # 기존: 흰 배경 + 검은 글자
    # 변경: 검은 배경 + 흰 글자
    canvas = 255 - canvas

    cv2.imwrite("debug_last_processed_crop_emnist_style.png", canvas)

    pil_img = Image.fromarray(canvas)

    tensor = emnist_transform(pil_img)
    tensor = tensor.unsqueeze(0)

    return tensor


# =========================
# 문자 분류 함수
# =========================

def classify_character(model, crop):
    """
    EMNIST 모델로 crop 문자를 분류한다.

    E -> Enemy1
    F -> Enemy2
    그 외 알파벳 -> Enemy3
    """

    tensor = preprocess_crop_for_emnist(crop).to(DEVICE)

    with torch.no_grad():
        outputs = model(tensor)
        probs = F.softmax(outputs, dim=1)
        confidence, pred_index = probs.max(dim=1)

    pred_char = index_to_char(pred_index.item())
    confidence = confidence.item()

    print(f"pred_char: {pred_char}, confidence: {confidence:.4f}")

    if pred_char == "E":
        return "Enemy1"
    elif pred_char == "F":
        return "Enemy2"
    else:
        return "Enemy3"


# =========================
# 메인 함수
# =========================

def main():
    print("DEVICE:", DEVICE)

    # JSON 읽기
    data = load_map_json(INPUT_JSON_PATH)

    map_info = data["map"]
    map_w = map_info["width"]
    map_h = map_info["height"]

    # 이미지 읽기
    image = cv2.imread(IMAGE_PATH)

    if image is None:
        raise FileNotFoundError(f"이미지를 찾을 수 없습니다: {IMAGE_PATH}")

    image_h, image_w = image.shape[:2]

    # 모델 읽기
    model = load_model()

    # 문자 위치 찾기
    regions = find_character_regions(image)

    print("detected regions:", regions)

    enemies = []

    debug_image = image.copy()

    for i, (x, y, w, h) in enumerate(regions):
        # 문자 crop
        crop = image[y:y + h, x:x + w]

        # crop 디버그 저장
        cv2.imwrite(f"debug_crop_{i}.png", crop)

        # 바운딩 박스 중심점 구하기
        center_x = x + w / 2
        center_y = y + h / 2

        # 픽셀 좌표 -> 타일맵 좌표
        tile_x, tile_y = pixel_to_tile(
            center_x,
            center_y,
            image_w,
            image_h,
            map_w,
            map_h
        )

        # EMNIST 모델로 문자 분류
        enemy_type = classify_character(model, crop)

        enemy_data = {
            "x": tile_x,
            "y": tile_y,
            "type": enemy_type
        }

        enemies.append(enemy_data)

        # 디버그 이미지에 박스 표시
        cv2.rectangle(
            debug_image,
            (x, y),
            (x + w, y + h),
            (0, 0, 255),
            3
        )

        cv2.putText(
            debug_image,
            f"{enemy_type} ({tile_x},{tile_y})",
            (x, max(0, y - 10)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 0, 255),
            2
        )

    # 기존 enemies를 덮어쓰기
    data["enemies"] = enemies

    # JSON 저장
    save_json(data, OUTPUT_JSON_PATH)

    # 디버그 이미지 저장
    cv2.imwrite("debug_detected_enemies.png", debug_image)

    print("완료!")
    print(json.dumps({"enemies": enemies}, indent=2, ensure_ascii=False))
    print("저장된 파일:", OUTPUT_JSON_PATH)
    print("디버그 이미지:", "debug_detected_enemies.png")


if __name__ == "__main__":
    main()