import cv2
import numpy as np
import json


def extract_ground_tiles_from_image(
    image_path,
    map_width,
    map_height,
    tile_size,
    chunkX,
    chunkY,
    tiles
):

    img = cv2.imread(image_path)

    if img is None:
        print(f"이미지를 불러오지 못했습니다: {image_path}")
        return tiles

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    _, thresh = cv2.threshold(
        gray,
        150,
        255,
        cv2.THRESH_BINARY_INV
    )

    target_width = map_width * tile_size
    target_height = map_height * tile_size

    thresh = cv2.resize(
        thresh,
        (target_width, target_height),
        interpolation=cv2.INTER_LINEAR
    )

    ground_tops = []

    for tile_x in range(map_width):
        pixel_x_start = tile_x * tile_size
        pixel_x_end = pixel_x_start + tile_size

        column_area = thresh[:, pixel_x_start:pixel_x_end]

        white_pixels = np.where(column_area > 0)

        if len(white_pixels[0]) == 0:
            continue

        pixel_y = int(np.mean(white_pixels[0]))

        tile_y_from_top = pixel_y // tile_size

        # 청크 내부 좌표
        local_x = tile_x
        local_y = map_height - 1 - tile_y_from_top

        # 전체 월드 좌표로 변환
        global_x = chunkX * map_width + local_x
        global_y = chunkY * map_height + local_y

        ground_tops.append({
            "x": int(global_x),
            "y": int(global_y),
            "type": "GroundTop"
        })

    for top in ground_tops:
        x = top["x"]
        top_y = top["y"]

        # GroundTop 추가
        tiles.append(top)

        # 해당 청크의 바닥 y 좌표
        chunk_bottom_y = chunkY * map_height

        # GroundTop 아래를 GroundBody로 채우기
        for y in range(chunk_bottom_y, top_y):
            tiles.append({
                "x": x,
                "y": y,
                "type": "GroundBody"
            })

    return tiles