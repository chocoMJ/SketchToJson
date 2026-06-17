import os
import random
import numpy as np
from PIL import Image, ImageDraw


IMAGE_SIZE = 28
OUTER_START_MIN = 3
OUTER_START_MAX = 7
OUTER_END_MIN = 18
OUTER_END_MAX = 24


def random_outer_start():
    return random.randint(OUTER_START_MIN, OUTER_START_MAX)


def random_outer_end():
    return random.randint(OUTER_END_MIN, OUTER_END_MAX)


def make_canvas():
    return Image.new("L", (IMAGE_SIZE, IMAGE_SIZE), 0)


def jitter_point(x, y, amount=1):
    return (
        max(1, min(26, x + random.randint(-amount, amount))),
        max(1, min(26, y + random.randint(-amount, amount)))
    )


def draw_lines(points, width=None):
    img = make_canvas()
    draw = ImageDraw.Draw(img)

    if width is None:
        width = random.randint(1, 2)

    points = [jitter_point(x, y) for x, y in points]
    draw.line(points, fill=255, width=width)

    return np.array(img, dtype=np.uint8)


def make_rectangle():
    x1 = random_outer_start()
    y1 = random_outer_start()
    x2 = random_outer_end()
    y2 = random_outer_end()

    points = [
        (x1, y1),
        (x2, y1),
        (x2, y2),
        (x1, y2),
        (x1, y1)
    ]

    return draw_lines(points)


def make_d_shape():
    # ㄷ / U 계열. 회전/반전은 나중에 랜덤으로 처리
    x1 = random_outer_start()
    y1 = random_outer_start()
    x2 = random_outer_end()
    y2 = random_outer_end()

    points = [
        (x2, y1),
        (x1, y1),
        (x1, y2),
        (x2, y2)
    ]

    return draw_lines(points)


def make_L_shape():
    x1 = random_outer_start()
    y1 = random_outer_start()
    x2 = random_outer_end()
    y2 = random_outer_end()

    points = [
        (x1, y1),
        (x1, y2),
        (x2, y2)
    ]

    return draw_lines(points)


def make_concave_shape():
    x1 = random_outer_start()
    y1 = random_outer_start()
    x2 = random_outer_end()
    y2 = random_outer_end()

    notch_x1 = random.randint(x1 + 2, 12)
    notch_x2 = random.randint(13, x2 - 2)
    notch_y = random.randint(y1 + 2, y2 - 2)

    points = [
        (x1, y1),
        (x2, y1),
        (x2, y2),
        (notch_x2, y2),
        (notch_x2, notch_y),
        (notch_x1, notch_y),
        (notch_x1, y2),
        (x1, y2),
        (x1, y1)
    ]

    return draw_lines(points)

def make_protruded_shape():
    x1 = random_outer_start()
    y1 = random_outer_start()
    x2 = random_outer_end()
    y2 = random_outer_end() - 2

    notch_x1 = random.randint(x1 + 2, 12)
    notch_x2 = random.randint(13, x2 - 2)
    notch_y = random.randint(y2 + 3, 26)

    points = [
        (x1, y1),
        (x2, y1),
        (x2, y2),
        (notch_x2, y2),
        (notch_x2, notch_y),
        (notch_x1, notch_y),
        (notch_x1, y2),
        (x1, y2),
        (x1, y1)
    ]

    return draw_lines(points)


def make_stair_shape():
    # 계단형 구조선
    x = random_outer_start()
    y = random_outer_start()

    step_w = random.randint(3, 5)
    step_h = random.randint(3, 5)
    steps = random.randint(3, 5)

    points = [(x, y)]

    for _ in range(steps):
        x = min(26, x + step_w)
        points.append((x, y))

        y = min(26, y + step_h)
        points.append((x, y))

    return draw_lines(points)


def make_irregular_room():
    start = (random.randint(2, 5), random.randint(3, 8))
    # 불규칙한 방/외곽 구조
    points = [
        start,
        (random.randint(10, 16), random.randint(2, 6)),
        (random.randint(20, 26), random.randint(6, 12)),
        (random.randint(21, 26), random.randint(17, 25)),
        (random.randint(12, 18), random.randint(20, 26)),
        (random.randint(3, 8), random.randint(16, 24)),
        start,
    ]

    return draw_lines(points)


def make_random_polyline():
    # 여러 번 꺾이는 열린 구조선
    num_points = random.randint(3, 6)

    x = random.randint(2, 26)
    y = random.randint(2, 26)
    points = [(x, y)]

    for _ in range(num_points - 1):
        x += random.randint(-10, 10)
        y += random.randint(-10, 10)

        x = max(1, min(26, x))
        y = max(1, min(26, y))

        points.append((x, y))

    return draw_lines(points)


def random_rotate_or_flip(arr):
    # 방향 다양화: 회전/반전
    k = random.randint(0, 3)
    arr = np.rot90(arr, k)

    if random.random() < 0.5:
        arr = np.fliplr(arr)

    if random.random() < 0.5:
        arr = np.flipud(arr)

    return arr.copy()


def make_structure_sample():
    maker = random.choice([
        make_rectangle,
        make_d_shape,
        make_L_shape,
        make_concave_shape,
        make_protruded_shape,
        make_stair_shape,
        make_irregular_room,
        make_random_polyline,
    ])

    arr = maker()
    arr = random_rotate_or_flip(arr)

    return arr


def make_structure_npy(save_path="data_polygon/structure.npy", count=50000):
    samples = []

    for _ in range(count):
        arr = make_structure_sample()
        arr = arr.reshape(-1)  # 28x28 -> 784
        samples.append(arr)

    samples = np.array(samples, dtype=np.uint8)

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    np.save(save_path, samples)

    print("saved npy:", save_path)
    print("shape:", samples.shape)


if __name__ == "__main__":
    make_structure_npy("data_polygon/structure.npy", count=50000)
