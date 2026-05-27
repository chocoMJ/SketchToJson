import cv2
import os
import numpy as np


def segment_connected_components(img, debug_dir="debug_segments"):
    # 디버그 폴더 생성
    os.makedirs(debug_dir, exist_ok=True)

    if img is None:
        print("이미지를 불러오지 못했습니다.")
        return []

    # 흑백 변환
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 이진화
    _, thresh = cv2.threshold(
        gray,
        150,
        255,
        cv2.THRESH_BINARY_INV
    )

    # 붙어있는 흰색 덩어리 단위로 분리
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        thresh,
        connectivity=8
    )

    segments = []

    # 디버그용 이미지
    debug_img = img.copy()

    for label_id in range(1, num_labels):  # 0은 배경
        x = stats[label_id, cv2.CC_STAT_LEFT]
        y = stats[label_id, cv2.CC_STAT_TOP]
        w = stats[label_id, cv2.CC_STAT_WIDTH]
        h = stats[label_id, cv2.CC_STAT_HEIGHT]
        area = stats[label_id, cv2.CC_STAT_AREA]

        # 너무 작은 노이즈 제거
        if area < 20:
            continue

        # 현재 label에 해당하는 픽셀만 crop
        crop = (labels[y:y+h, x:x+w] == label_id).astype("uint8") * 255

        segment_info = {
            "label_id": int(label_id),
            "x": int(x),
            "y": int(y),
            "w": int(w),
            "h": int(h),
            "area": int(area),
            "crop": crop
        }

        segments.append(segment_info)

        # 디버그 이미지에 bounding box 그리기
        cv2.rectangle(
            debug_img,
            (x, y),
            (x + w, y + h),
            (0, 0, 255),
            2
        )

        #label 번호 표시
        cv2.putText(
            debug_img,
            f"id:{label_id} area:{area}",
            (x, max(y - 5, 15)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 0, 255),
            1,
            cv2.LINE_AA
        )

        # 각 segment crop 저장
        crop_path = os.path.join(debug_dir, f"segment_{label_id}.png")
        cv2.imwrite(crop_path, crop)

    # 전체 이진화 이미지 저장
    cv2.imwrite(os.path.join(debug_dir, "threshold.png"), thresh)

    # bounding box가 그려진 디버그 이미지 저장
    cv2.imwrite(os.path.join(debug_dir, "debug_boxes.png"), debug_img)

    #print(f"총 segment 개수: {len(segments)}")
    #print(f"디버그 이미지 저장 위치: {debug_dir}")
    #print("저장된 파일:")
    #print("- threshold.png")
    #print("- debug_boxes.png")
    #print("- segment_번호.png")

    return segments