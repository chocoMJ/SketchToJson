import json
import cv2
import os

from segmentation import segment_connected_components
from classify_segment import classify_segment_type
from symbol_recognizer import predict_symbol
from line_to_tiles import extract_ground_tiles_from_image


def make_worldmap(world_width, world_height, tile_size, tiles):
    return {
        "map": {
            "width": world_width,
            "height": world_height,
            "tileSize": tile_size
        },
        "tiles": tiles,
        "enemies": []
    }


def save_worldmap(worldmap, output_path):
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(worldmap, f, indent=2, ensure_ascii=False)

    print(f"{output_path} 저장 완료")


def image_to_FormData(img):
    segments = segment_connected_components(img)
    form_data_list = []

    for segment_info in segments :
        seg_type = classify_segment_type(segment_info)
        if seg_type == "LINE" :
            extract_ground_tiles_from_image(segment_info)
        else :
            symbol_type = predict_symbol(segment_info["crop"])
        
    

    

img = cv2.imread("test.png")
image_to_FormData(img)
