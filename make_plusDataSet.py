import os
import random
import math
import numpy as np
from PIL import Image, ImageDraw

from dataset_style import draw_jittered_line, finalize_image, random_stroke_width

IMAGE_SIZE = 28
SCALE = 4
CANVAS_SIZE = IMAGE_SIZE * SCALE


def make_canvas():
    return Image.new("L", (CANVAS_SIZE, CANVAS_SIZE), 0)


def rotate_randomly(img):
    angle = random.uniform(0, 360)
    return img.rotate(angle, resample=Image.Resampling.NEAREST, expand=True, fillcolor=0)


def make_plus():
    img = make_canvas()
    draw = ImageDraw.Draw(img)

    width = random_stroke_width(SCALE)
    center_x = random.randint(46, 66)
    center_y = random.randint(46, 66)
    up_length = random.randint(34, 62)
    down_length = random.randint(34, 62)
    left_length = random.randint(34, 62)
    right_length = random.randint(34, 62)

    vertical_start = (center_x, center_y - up_length)
    vertical_end = (center_x, center_y + down_length)
    draw_jittered_line(
        draw,
        [vertical_start, vertical_end],
        fill=255,
        width=width,
        scale=SCALE,
    )

    horizontal_angle = math.radians(random.uniform(-1, 1))
    left_dx = math.cos(horizontal_angle) * left_length
    left_dy = math.sin(horizontal_angle) * left_length
    right_dx = math.cos(horizontal_angle) * right_length
    right_dy = math.sin(horizontal_angle) * right_length
    horizontal_start = (center_x - left_dx, center_y - left_dy)
    horizontal_end = (center_x + right_dx, center_y + right_dy)
    draw_jittered_line(
        draw,
        [horizontal_start, horizontal_end],
        fill=255,
        width=width,
        scale=SCALE,
    )

    return finalize_image(rotate_randomly(img), IMAGE_SIZE)


def make_plus_sample():
    return make_plus()


def make_plus_npy(save_path="data_polygon/plus.npy", count=50000):
    samples = []

    for _ in range(count):
        arr = make_plus_sample()
        arr = arr.reshape(-1)
        samples.append(arr)

    samples = np.array(samples, dtype=np.uint8)

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    np.save(save_path, samples)

    print("saved npy:", save_path)
    print("shape:", samples.shape)


if __name__ == "__main__":
    make_plus_npy("data_polygon/plus.npy", count=50000)
