import json
import cv2
import os

import segmentation
import classify_segment
import make_chunk
import sketch_to_json


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


def main():
    json_path = "chunks.json"
    image_dir = "images"

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    chunk_info = data["chunk"]

    map_width = chunk_info["width"]
    map_height = chunk_info["height"]
    tile_size = chunk_info["tileSize"]

    all_tiles = []

    max_chunk_x = 0
    max_chunk_y = 0

    for image_info in data["images"]:
        file_name = image_info["file"]
        chunk_x = image_info["chunkX"]
        chunk_y = image_info["chunkY"]

        max_chunk_x = max(max_chunk_x, chunk_x)
        max_chunk_y = max(max_chunk_y, chunk_y)

        image_path = os.path.join(image_dir, file_name)

        sketch_to_json.extract_ground_tiles_from_image(
            image_path,
            map_width,
            map_height,
            tile_size,
            chunk_x,
            chunk_y,
            all_tiles
        )

    world_width = (max_chunk_x + 1) * map_width
    world_height = (max_chunk_y + 1) * map_height

    worldmap = make_worldmap(
        world_width,
        world_height,
        tile_size,
        all_tiles
    )

    save_worldmap(worldmap, "worldmap.json")


if __name__ == "__main__":
    main()