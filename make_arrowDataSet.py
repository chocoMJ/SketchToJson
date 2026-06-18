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


def make_arrow():
    img = make_canvas()
    draw = ImageDraw.Draw(img)

    width = random_stroke_width(SCALE)
    line_length = random.randint(88, 108)
    angle = math.radians(random.randint(35, 55))
    head_length = random.randint(26, 38)
    center_offset = random.randint(-10, 10)

    center_x = CANVAS_SIZE // 2
    center_y = CANVAS_SIZE // 2 + center_offset
    half_length = line_length / 2

    tail = (
        center_x - half_length,
        center_y,
    )
    tip = (
        center_x + half_length,
        center_y,
    )

    draw_jittered_line(draw, [tail, tip], fill=255, width=width, scale=SCALE)

    for side in (-1, 1):
        side_dx = -math.cos(angle)
        side_dy = side * math.sin(angle)
        side_length = head_length + random.randint(-4, 4)
        head_end = (
            tip[0] + side_dx * side_length,
            tip[1] + side_dy * side_length,
        )
        draw_jittered_line(draw, [tip, head_end], fill=255, width=width, scale=SCALE)

    return finalize_image(rotate_randomly(img), IMAGE_SIZE)


def make_arrow_sample():
    return make_arrow()


def make_arrow_npy(save_path="data_polygon/arrow.npy", count=50000):
    samples = []

    for _ in range(count):
        arr = make_arrow_sample()
        arr = arr.reshape(-1)
        samples.append(arr)

    samples = np.array(samples, dtype=np.uint8)

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    np.save(save_path, samples)

    print("saved npy:", save_path)
    print("shape:", samples.shape)


if __name__ == "__main__":
    make_arrow_npy("data_polygon/arrow.npy", count=50000)
