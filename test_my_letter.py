import torch
import numpy as np
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image, ImageOps
import matplotlib.pyplot as plt



MODEL_PATH = "emnist_letters_cnn.pth"
IMAGE_PATH = "my_letter.png"

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def preprocess_image(image_path):
    # 1. 흑백으로 열기
    image = Image.open(image_path).convert("L")

    # 2. numpy 배열로 변환
    arr = np.array(image)

    # 3. 검은 글자 픽셀 찾기
    # 흰 배경은 255에 가깝고, 검은 선은 0에 가까움
    ys, xs = np.where(arr < 200)

    if len(xs) == 0 or len(ys) == 0:
        raise ValueError("글자 픽셀을 찾지 못했습니다.")

    # 4. 글자 영역 bounding box 구하기
    x1, x2 = xs.min(), xs.max()
    y1, y2 = ys.min(), ys.max()

    char = arr[y1:y2 + 1, x1:x2 + 1]

    # 5. 정사각형 캔버스 중앙에 배치
    h, w = char.shape
    size = max(h, w)

    canvas = np.ones((size, size), dtype=np.uint8) * 255

    offset_x = (size - w) // 2
    offset_y = (size - h) // 2

    canvas[offset_y:offset_y + h, offset_x:offset_x + w] = char

    # 6. 여백 추가
    pad = size // 4
    canvas = np.pad(
        canvas,
        pad_width=pad,
        mode="constant",
        constant_values=255
    )

    # 7. PIL 이미지로 변환
    image = Image.fromarray(canvas)

    # 8. 흰 배경 + 검은 글자 → 검은 배경 + 흰 글자
    image = ImageOps.invert(image)

    # 디버그용 저장
    image.save("debug_preprocessed_before_resize.png")

    # 9. 모델 입력 형태로 변환
    transform = transforms.Compose([
        transforms.Resize((28, 28)),
        transforms.ToTensor(),
        transforms.Normalize((0.5,), (0.5,))
    ])

    tensor = transform(image)

    return tensor.unsqueeze(0)

class LetterNet(nn.Module):
    def __init__(self):
        super(LetterNet, self).__init__()
        self.conv1 = nn.Conv2d(1, 32, 3, 1)
        self.conv2 = nn.Conv2d(32, 64, 3, 1)
        self.dropout1 = nn.Dropout(0.25)
        self.dropout2 = nn.Dropout(0.5)
        self.fc1 = nn.Linear(9216, 128)
        self.fc2 = nn.Linear(128, 26)

    def forward(self, x):
        x = self.conv1(x)
        x = F.relu(x)
        x = self.conv2(x)
        x = F.relu(x)
        x = F.max_pool2d(x, 2)
        x = self.dropout1(x)
        x = torch.flatten(x, 1)
        x = self.fc1(x)
        x = F.relu(x)
        x = self.dropout2(x)
        x = self.fc2(x)
        output = F.log_softmax(x, dim=1)
        return output


def index_to_char(index):
    return chr(ord("A") + index)

def main():
    print("DEVICE:", DEVICE)

    model = LetterNet().to(DEVICE)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model.eval()

    tensor = preprocess_image(IMAGE_PATH).to(DEVICE)

    with torch.no_grad():
        output = model(tensor)

        # log_softmax 결과이므로 exp 하면 확률처럼 볼 수 있음
        probs = torch.exp(output)

        confidence, pred_index = probs.max(dim=1)

    pred_char = index_to_char(pred_index.item())

    print("Predicted:", pred_char)
    print("Confidence:", confidence.item())

    original_img = Image.open(IMAGE_PATH).convert("L")

    plt.figure(figsize=(4, 4))
    plt.imshow(original_img, cmap="gray")
    plt.title(f"Pred: {pred_char} | Confidence: {confidence.item():.2f}")
    plt.axis("off")
    plt.show()


if __name__ == "__main__":
    main()