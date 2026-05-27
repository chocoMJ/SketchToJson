import json
import cv2
import numpy as np


def crop_to_png_bytes(crop):
    """
    crop ndarray를 PNG bytes로 변환
    """
    success, buffer = cv2.imencode(".png", crop)

    if not success:
        raise ValueError("crop 이미지를 PNG로 인코딩하지 못했습니다.")

    return buffer.tobytes()


def clamp(v, min_v, max_v):
    return max(min_v, min(v, max_v))


def pixel_to_tile(pixel_x, pixel_y, tile_pixel_width, tile_pixel_height, tile_count):
    """
    원본 이미지 기준 픽셀 좌표를 타일 좌표로 변환
    """
    tile_x = int(pixel_x // tile_pixel_width)
    tile_y = int(pixel_y // tile_pixel_height)

    tile_x = clamp(tile_x, 0, tile_count - 1)
    tile_y = clamp(tile_y, 0, tile_count - 1)

    return {
        "x": int(tile_x),
        "y": int(tile_y),
    }


def make_form_data_item(segment, segment_type, original_height, original_width, tile_count=16):
    """
    triangle / star : 
    
    metadata:
    "type": type,
    "tile_pos": {
        "x": int,
        "y": int,
    },
    "image_field": "file_triangle_{label_id}",
    "image_filename": "triangle_{label_id}.png",

    file_item :
    "segment_id": "triangle_{label_id}",
    "field_name": "file_triangle_{label_id}",
    "filename": "triangle_{label_id}.png",
    "content": png_bytes,
    "content_type": "image/png",



    structure의 경우 다음 추가
    "points": [
        {
            "x": int,
            "y": int,
        },
        ...
    ],
    """

    if tile_count <= 0:
        raise ValueError("tile_count는 1 이상이어야 합니다.")

    tile_pixel_width = original_width / tile_count
    tile_pixel_height = original_height / tile_count

    x = int(segment["x"])
    y = int(segment["y"])
    w = int(segment["w"])
    h = int(segment["h"])
    crop = segment["crop"]

    segment_id = f"{segment_type}_{segment['label_id']}"
    image_field = f"file_{segment_id}"
    filename = f"{segment_id}.png"

    # bbox 중심 픽셀 좌표
    center_x = x + w / 2.0
    center_y = y + h / 2.0

    # bbox 중심을 타일 좌표로 변환
    tile_pos = pixel_to_tile(
        center_x,
        center_y,
        tile_pixel_width,
        tile_pixel_height,
        tile_count
    )

    metadata = {
        "type": segment_type,
        "tile_pos": tile_pos,

        # 파일과 연결하기 위한 정보
        "image_field": image_field,
        "image_filename": filename,
    }

    if segment_type in ["triangle", "star"]:
        # 별 / 삼각형은 오브젝트 하나만 소환하므로 tile_pos 하나만 사용
        pass

    elif segment_type == "structure":
        ys, xs = np.where(crop > 0)

        point_set = set()

        for px, py in zip(xs, ys):
            original_x = x + px
            original_y = y + py

            point = pixel_to_tile(
                original_x,
                original_y,
                tile_pixel_width,
                tile_pixel_height,
                tile_count
            )

            point_set.add((point["x"], point["y"]))

        metadata["points"] = [
            {
                "x": int(tx),
                "y": int(ty),
            }
            for tx, ty in sorted(point_set)
        ]

    else:
        raise ValueError(f"알 수 없는 segment_type입니다: {segment_type}")

    # 확인용 이미지 파일
    display_crop = 255 - crop
    png_bytes = crop_to_png_bytes(display_crop)

    file_item = {
        "segment_id": segment_id,
        "field_name": image_field,
        "filename": filename,
        "content": png_bytes,
        "content_type": "image/png",
    }

    return metadata, file_item