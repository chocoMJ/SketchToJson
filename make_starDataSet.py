import os
import random
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


def jitter(point, amount):
    x, y = point
    return (
        x + random.randint(-amount, amount),
        y + random.randint(-amount, amount),
    )


def make_star():
    img = make_canvas()
    draw = ImageDraw.Draw(img)

    width = random.randint(4, 10)
    shift_x = random.randint(-4, 4)
    shift_y = random.randint(-4, 4)
    scale = random.uniform(0.9, 1.08)
    center = CANVAS_SIZE / 2

    base_points = {
        "top": (56, 14),
        "left_upper": (18, 42),
        "right_upper": (94, 42),
        "left_lower": (30, 92),
        "right_lower": (82, 92),
    }

    points = {}
    for name, (x, y) in base_points.items():
        scaled = (
            center + (x - center) * scale + shift_x,
            center + (y - center) * scale + shift_y,
        )
        points[name] = jitter((round(scaled[0]), round(scaled[1])), 4)

    if random.random() < 0.5:
        order = [
            points["top"],
            points["left_lower"],
            points["right_upper"],
            points["left_upper"],
            points["right_lower"],
            points["top"],
        ]
    else:
        order = [
            points["top"],
            points["right_lower"],
            points["left_upper"],
            points["right_upper"],
            points["left_lower"],
            points["top"],
        ]

    draw.line(order, fill=255, width=width, joint="curve")

    return downsample(img)


def make_star_sample():
    return make_star()


def make_star_npy(save_path="data_polygon/handstar.npy", count=50000):
    samples = []

    for _ in range(count):
        arr = make_star_sample()
        arr = arr.reshape(-1)
        samples.append(arr)

    samples = np.array(samples, dtype=np.uint8)

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    np.save(save_path, samples)

    print("saved npy:", save_path)
    print("shape:", samples.shape)


if __name__ == "__main__":
    make_star_npy("data_polygon/handstar.npy", count=50000)
