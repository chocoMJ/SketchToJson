import os
import random
import math
import numpy as np
from PIL import Image, ImageDraw

IMAGE_SIZE = 28
SCALE = 4
CANVAS_SIZE = IMAGE_SIZE * SCALE


def make_canvas():
    return Image.new("L", (CANVAS_SIZE, CANVAS_SIZE), 0)


def downsample(img):
    img = img.resize((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.BILINEAR)
    return np.array(img, dtype=np.uint8)


def draw_centered_line(draw, center, length, angle, width):
    cx, cy = center
    half = length / 2
    dx = math.cos(angle) * half
    dy = math.sin(angle) * half

    draw.line(
        [(cx - dx, cy - dy), (cx + dx, cy + dy)],
        fill=255,
        width=width,
    )


def make_hash():
    img = make_canvas()
    draw = ImageDraw.Draw(img)

    width = random.randint(4, 8)
    center_x = random.randint(52, 60)
    center_y = random.randint(52, 60)
    vertical_length = random.randint(68, 88)
    horizontal_length = random.randint(68, 88)
    gap = random.randint(20, 32)

    vertical_angle = math.radians(random.uniform(-6, 6) - 90)
    horizontal_angle = math.radians(random.uniform(-6, 6))

    vertical_dx = math.cos(horizontal_angle) * gap / 2
    vertical_dy = math.sin(horizontal_angle) * gap / 2
    horizontal_dx = math.cos(vertical_angle) * gap / 2
    horizontal_dy = math.sin(vertical_angle) * gap / 2

    for side in (-1, 1):
        draw_centered_line(
            draw,
            (center_x + vertical_dx * side, center_y + vertical_dy * side),
            vertical_length,
            vertical_angle,
            width,
        )
        draw_centered_line(
            draw,
            (center_x + horizontal_dx * side, center_y + horizontal_dy * side),
            horizontal_length,
            horizontal_angle,
            width,
        )

    rotation_angle = random.uniform(-20, 20)
    img = img.rotate(rotation_angle, resample=Image.Resampling.NEAREST, fillcolor=0)

    return downsample(img)


def make_hash_sample():
    return make_hash()


def make_hash_npy(save_path="data_polygon/hash.npy", count=50000):
    samples = []

    for _ in range(count):
        arr = make_hash_sample()
        arr = arr.reshape(-1)
        samples.append(arr)

    samples = np.array(samples, dtype=np.uint8)

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    np.save(save_path, samples)

    print("saved npy:", save_path)
    print("shape:", samples.shape)


if __name__ == "__main__":
    make_hash_npy("data_polygon/hash.npy", count=50000)
