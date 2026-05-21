import os
import random
import numpy as np
from PIL import Image, ImageDraw


IMAGE_SIZE = 28


def make_canvas():
    # QuickDraw npy 스타일: 검은 배경(0), 흰 선(255)
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
    x1 = random.randint(2, 7)
    y1 = random.randint(2, 7)
    x2 = random.randint(18, 26)
    y2 = random.randint(18, 26)

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
    x1 = random.randint(3, 7)
    y1 = random.randint(3, 7)
    x2 = random.randint(18, 25)
    y2 = random.randint(18, 25)

    points = [
        (x2, y1),
        (x1, y1),
        (x1, y2),
        (x2, y2)
    ]

    return draw_lines(points)


def make_l_shape():
    x1 = random.randint(3, 8)
    y1 = random.randint(3, 8)
    x2 = random.randint(18, 26)
    y2 = random.randint(18, 26)

    points = [
        (x1, y1),
        (x1, y2),
        (x2, y2)
    ]

    return draw_lines(points)


def make_notched_shape():
    # 요철 / 튀어나온 방 모양
    x1 = random.randint(2, 5)
    y1 = random.randint(3, 7)
    x2 = random.randint(21, 26)
    y2 = random.randint(20, 26)

    notch_x1 = random.randint(9, 12)
    notch_x2 = random.randint(15, 19)
    notch_y = random.randint(10, 15)

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
    x = random.randint(2, 5)
    y = random.randint(4, 8)

    step_w = random.randint(4, 6)
    step_h = random.randint(3, 5)
    steps = random.randint(3, 4)

    points = [(x, y)]

    for _ in range(steps):
        x = min(26, x + step_w)
        points.append((x, y))

        y = min(26, y + step_h)
        points.append((x, y))

    return draw_lines(points)


def make_irregular_room():
    # 불규칙한 방/외곽 구조
    points = [
        (random.randint(2, 5), random.randint(3, 8)),
        (random.randint(10, 16), random.randint(2, 6)),
        (random.randint(20, 26), random.randint(6, 12)),
        (random.randint(21, 26), random.randint(17, 25)),
        (random.randint(12, 18), random.randint(20, 26)),
        (random.randint(3, 8), random.randint(16, 24)),
        (random.randint(2, 5), random.randint(3, 8)),
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
        make_l_shape,
        make_notched_shape,
        make_stair_shape,
        make_irregular_room,
        make_random_polyline,
    ])

    arr = maker()
    arr = random_rotate_or_flip(arr)

    return arr


def save_preview_grid(save_path="structure_preview.png", count=64, scale=8):
    cols = 8
    rows = count // cols

    grid = Image.new("L", (cols * IMAGE_SIZE, rows * IMAGE_SIZE), 0)

    for i in range(count):
        arr = make_structure_sample()
        img = Image.fromarray(arr)

        x = (i % cols) * IMAGE_SIZE
        y = (i // cols) * IMAGE_SIZE
        grid.paste(img, (x, y))

    grid = grid.resize(
        (grid.width * scale, grid.height * scale),
        Image.Resampling.NEAREST
    )

    grid.save(save_path)
    print("saved preview:", save_path)


def make_structure_npy(save_path="data_polygon/structure.npy", count=5000):
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
    print("dtype:", samples.dtype)
    print("min/max:", samples.min(), samples.max())


if __name__ == "__main__":
    # 1. 먼저 이걸 보고 생성 결과 확인
    save_preview_grid("structure_preview.png", count=64)

    # 2. 미리보기가 괜찮으면 이걸 사용
    make_structure_npy("data_polygon/structure.npy", count=5000)