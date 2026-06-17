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


def make_handtriangle():
    img = make_canvas()
    draw = ImageDraw.Draw(img)

    width = random.randint(4, 10)
    left = random.randint(12, 24)
    right = random.randint(88, 100)
    top = random.randint(10, 24)
    bottom = random.randint(82, 100)

    apex_x = random.randint(left + 18, right - 18)
    apex_y = random.randint(top, top + 10)
    left_x = random.randint(left, left + 12)
    left_y = random.randint(bottom - 8, bottom)
    right_x = random.randint(right - 12, right)
    right_y = random.randint(bottom - 8, bottom)

    points = [
        (apex_x, apex_y),
        (right_x, right_y),
        (left_x, left_y),
        (apex_x, apex_y),
    ]

    draw.line(points, fill=255, width=width, joint="curve")

    return downsample(img)


def make_handtriangle_sample():
    return make_handtriangle()


def make_handtriangle_npy(save_path="data_polygon/handtriangle.npy", count=50000):
    samples = []

    for _ in range(count):
        arr = make_handtriangle_sample()
        arr = arr.reshape(-1)
        samples.append(arr)

    samples = np.array(samples, dtype=np.uint8)

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    np.save(save_path, samples)

    print("saved npy:", save_path)
    print("shape:", samples.shape)


if __name__ == "__main__":
    make_handtriangle_npy("data_polygon/handtriangle.npy", count=50000)
