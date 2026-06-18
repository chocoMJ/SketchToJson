import random
import math

import numpy as np
from PIL import Image


STROKE_WIDTH_MIN = 1
STROKE_WIDTH_MAX = 3


def random_stroke_width(scale=1):
    return random.randint(STROKE_WIDTH_MIN * scale, STROKE_WIDTH_MAX * scale)


def draw_jittered_line(draw, points, fill, width, scale=1, joint="curve"):
    jittered_points = []

    for index in range(len(points) - 1):
        start_x, start_y = points[index]
        end_x, end_y = points[index + 1]
        dx = end_x - start_x
        dy = end_y - start_y
        length = math.hypot(dx, dy)

        if length == 0:
            continue

        segment_count = max(2, round(length / (4 * scale)))
        normal_x = -dy / length
        normal_y = dx / length
        jitter_amount = random.uniform(0.5, 1.5) * scale

        if not jittered_points:
            jittered_points.append((start_x, start_y))

        for step in range(1, segment_count):
            ratio = step / segment_count
            offset = random.uniform(-jitter_amount, jitter_amount)
            jittered_points.append((
                start_x + dx * ratio + normal_x * offset,
                start_y + dy * ratio + normal_y * offset,
            ))

        jittered_points.append((end_x, end_y))

    if len(jittered_points) >= 2:
        draw.line(jittered_points, fill=fill, width=width, joint=joint)


def finalize_image(img, image_size=28):
    if not isinstance(img, Image.Image):
        img = Image.fromarray(np.asarray(img, dtype=np.uint8), mode="L")

    bbox = img.getbbox()
    if bbox is None:
        return np.zeros((image_size, image_size), dtype=np.uint8)

    img = img.crop(bbox)
    size = max(img.size)
    canvas = Image.new("L", (size, size), 0)
    left = (size - img.width) // 2
    top = (size - img.height) // 2
    canvas.paste(img, (left, top))
    canvas = canvas.resize((image_size, image_size), Image.Resampling.BILINEAR)

    return np.array(canvas, dtype=np.uint8)
