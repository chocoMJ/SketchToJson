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


def direction_vectors(direction):
    if direction == "right":
        return (1, 0), (0, 1)
    if direction == "left":
        return (-1, 0), (0, 1)
    if direction == "down":
        return (0, 1), (1, 0)
    if direction == "up":
        return (0, -1), (1, 0)

    raise ValueError(f"unknown arrow direction: {direction}")


def make_arrow(direction="right"):
    img = make_canvas()
    draw = ImageDraw.Draw(img)

    width = random.randint(4, 10)
    line_length = random.randint(88, 108)
    angle = math.radians(random.randint(35, 55))
    head_length = random.randint(26, 38)
    center_offset = random.randint(-10, 10)

    direction_vec, normal_vec = direction_vectors(direction)
    dx, dy = direction_vec
    nx, ny = normal_vec

    center_x = CANVAS_SIZE // 2 + nx * center_offset
    center_y = CANVAS_SIZE // 2 + ny * center_offset
    half_length = line_length / 2

    tail = (
        center_x - dx * half_length,
        center_y - dy * half_length,
    )
    tip = (
        center_x + dx * half_length,
        center_y + dy * half_length,
    )

    draw.line([tail, tip], fill=255, width=width)

    for side in (-1, 1):
        side_dx = -dx * math.cos(angle) + nx * side * math.sin(angle)
        side_dy = -dy * math.cos(angle) + ny * side * math.sin(angle)
        side_length = head_length + random.randint(-4, 4)
        head_end = (
            tip[0] + side_dx * side_length,
            tip[1] + side_dy * side_length,
        )
        draw.line([tip, head_end], fill=255, width=width)

    return downsample(img)


def make_arrow_sample():
    return make_arrow(random.choice(["right", "left", "up", "down"]))


def make_arrow_npy(save_path="data_polygon/arrow.npy", count_per_direction=50000):
    samples = []

    for direction in ["right", "left", "up", "down"]:
        for _ in range(count_per_direction):
            arr = make_arrow(direction)
            arr = arr.reshape(-1)
            samples.append(arr)

    samples = np.array(samples, dtype=np.uint8)
    np.random.shuffle(samples)

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    np.save(save_path, samples)

    print("saved npy:", save_path)
    print("shape:", samples.shape)


if __name__ == "__main__":
    make_arrow_npy("data_polygon/arrow.npy", count_per_direction=50000)
