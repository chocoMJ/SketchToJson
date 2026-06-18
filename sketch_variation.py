import contextlib
import math
import os
import random
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageDraw, ImageOps


IMAGE_SIZE = 28
SCALE = 4
CANVAS_SIZE = IMAGE_SIZE * SCALE


@dataclass(frozen=True)
class StrokeProfile:
    name: str
    weight: float
    jitter: float
    wave: float
    width_range: tuple[int, int]
    width_variation: float
    gap_chance: float
    max_gaps: int
    gap_fraction: tuple[float, float]
    curve: float


PROFILES = (
    StrokeProfile("light", 0.25, 0.7, 0.8, (4, 7), 0.10, 0.02, 1, (0.03, 0.05), 4.0),
    StrokeProfile("medium", 0.50, 1.6, 2.2, (5, 9), 0.22, 0.10, 1, (0.04, 0.08), 9.0),
    StrokeProfile("strong", 0.20, 2.9, 4.6, (5, 11), 0.35, 0.24, 2, (0.04, 0.10), 16.0),
    StrokeProfile("boundary", 0.05, 3.8, 6.5, (3, 12), 0.45, 0.34, 2, (0.05, 0.13), 22.0),
)


PROFILE_BY_NAME = {profile.name: profile for profile in PROFILES}


def make_canvas():
    return Image.new("L", (CANVAS_SIZE, CANVAS_SIZE), 0)


def downsample(img):
    img = img.resize((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.BILINEAR)
    return np.array(img, dtype=np.uint8)


@contextlib.contextmanager
def temporary_seed(seed):
    if seed is None:
        yield
        return

    random_state = random.getstate()
    np_state = np.random.get_state()
    random.seed(seed)
    np.random.seed(seed % (2**32))
    try:
        yield
    finally:
        random.setstate(random_state)
        np.random.set_state(np_state)


def choose_profile(name=None):
    if name is not None:
        return PROFILE_BY_NAME[name]

    return random.choices(PROFILES, weights=[profile.weight for profile in PROFILES], k=1)[0]


def random_width(profile):
    return random.randint(*profile.width_range)


def unit(angle):
    return math.cos(angle), math.sin(angle)


def normal(angle):
    return -math.sin(angle), math.cos(angle)


def point_from(point, angle, distance):
    x, y = point
    dx, dy = unit(angle)
    return x + dx * distance, y + dy * distance


def scale_points(points):
    return [(x * SCALE, y * SCALE) for x, y in points]


def rotate_points(points, angle, center=(CANVAS_SIZE / 2, CANVAS_SIZE / 2)):
    cx, cy = center
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)
    rotated = []

    for x, y in points:
        x -= cx
        y -= cy
        rotated.append((cx + x * cos_a - y * sin_a, cy + x * sin_a + y * cos_a))

    return rotated


def transform_points(points, *, scale=1.0, shift=(0, 0), center=(CANVAS_SIZE / 2, CANVAS_SIZE / 2)):
    cx, cy = center
    sx, sy = shift
    return [(cx + (x - cx) * scale + sx, cy + (y - cy) * scale + sy) for x, y in points]


def curved_line_points(start, end, curve_offset=0.0, steps=None):
    sx, sy = start
    ex, ey = end
    length = math.hypot(ex - sx, ey - sy)
    if steps is None:
        steps = max(5, int(length / 4))

    mx = (sx + ex) / 2
    my = (sy + ey) / 2
    if length:
        nx = -(ey - sy) / length
        ny = (ex - sx) / length
    else:
        nx = 0
        ny = 0

    cx = mx + nx * curve_offset
    cy = my + ny * curve_offset
    points = []

    for index in range(steps + 1):
        t = index / steps
        one_minus_t = 1 - t
        x = one_minus_t * one_minus_t * sx + 2 * one_minus_t * t * cx + t * t * ex
        y = one_minus_t * one_minus_t * sy + 2 * one_minus_t * t * cy + t * t * ey
        points.append((x, y))

    return points


def densify_path(points, curve_offsets=None):
    if len(points) < 2:
        return points[:]

    if curve_offsets is None:
        curve_offsets = [0.0] * (len(points) - 1)

    result = []
    for index, (start, end) in enumerate(zip(points, points[1:])):
        segment = curved_line_points(start, end, curve_offsets[index])
        if index:
            segment = segment[1:]
        result.extend(segment)

    return result


def _jiggle_path(points, profile):
    if len(points) <= 2:
        return points

    phase = random.uniform(0, math.tau)
    waves = random.uniform(1.0, 3.3)
    waved = []

    for index, (x, y) in enumerate(points):
        if index in (0, len(points) - 1):
            waved.append((x + random.uniform(-profile.jitter, profile.jitter) * 0.35,
                          y + random.uniform(-profile.jitter, profile.jitter) * 0.35))
            continue

        prev_x, prev_y = points[index - 1]
        next_x, next_y = points[index + 1]
        tangent = math.atan2(next_y - prev_y, next_x - prev_x)
        nx, ny = normal(tangent)
        progress = index / max(1, len(points) - 1)
        wave = math.sin(progress * math.tau * waves + phase) * profile.wave
        jitter = random.uniform(-profile.jitter, profile.jitter)
        waved.append((x + nx * (wave + jitter), y + ny * (wave + jitter)))

    return waved


def _gap_ranges(point_count, profile, allow_gap):
    if not allow_gap or point_count < 10 or random.random() >= profile.gap_chance:
        return []

    ranges = []
    gap_count = random.randint(1, profile.max_gaps)
    for _ in range(gap_count):
        start = random.randint(2, point_count - 5)
        size = max(1, int(point_count * random.uniform(*profile.gap_fraction)))
        ranges.append((start, min(point_count - 2, start + size)))

    return ranges


def _is_gapped(segment_index, ranges):
    return any(start <= segment_index <= end for start, end in ranges)


def draw_hand_path(draw, points, profile, *, width=None, curve_offsets=None, allow_gap=True):
    dense = densify_path(points, curve_offsets)
    dense = _jiggle_path(dense, profile)
    ranges = _gap_ranges(len(dense), profile, allow_gap)
    base_width = width if width is not None else random_width(profile)

    for index, (start, end) in enumerate(zip(dense, dense[1:])):
        if _is_gapped(index, ranges):
            continue

        multiplier = 1 + random.uniform(-profile.width_variation, profile.width_variation)
        stroke_width = max(1, int(round(base_width * multiplier)))
        draw.line([start, end], fill=255, width=stroke_width)


def render_paths(paths, *, profile=None, rotate=0.0, flip_x=False, flip_y=False, attempts=8):
    selected_profile = profile or choose_profile()
    last = None

    for attempt in range(attempts):
        img = make_canvas()
        draw = ImageDraw.Draw(img)

        for path in paths:
            draw_hand_path(
                draw,
                path["points"],
                selected_profile,
                width=path.get("width"),
                curve_offsets=path.get("curve_offsets"),
                allow_gap=path.get("allow_gap", True),
            )

        if flip_x:
            img = ImageOps.mirror(img)
        if flip_y:
            img = ImageOps.flip(img)
        if rotate:
            img = img.rotate(math.degrees(rotate), resample=Image.Resampling.BILINEAR, fillcolor=0)

        arr = downsample(img)
        last = arr
        if validate_sample(arr):
            return arr

        if attempt == attempts - 2 and selected_profile.name != "medium":
            selected_profile = PROFILE_BY_NAME["medium"]

    return last


def validate_sample(arr, min_pixels=10, max_edge_fraction=0.55):
    mask = arr > 24
    ink = int(mask.sum())
    if ink < min_pixels:
        return False

    ys, xs = np.where(mask)
    if xs.size == 0 or ys.size == 0:
        return False

    if xs.max() - xs.min() < 4 or ys.max() - ys.min() < 4:
        return False

    edge = (
        int(mask[0, :].sum())
        + int(mask[-1, :].sum())
        + int(mask[:, 0].sum())
        + int(mask[:, -1].sum())
    )
    return edge / ink <= max_edge_fraction


def build_sample_array(maker, count, *, shuffle=True):
    samples = np.empty((count, IMAGE_SIZE * IMAGE_SIZE), dtype=np.uint8)
    for index in range(count):
        samples[index] = maker().reshape(-1)

    if shuffle:
        np.random.shuffle(samples)
    return samples


def save_samples(save_path, maker, count, *, seed=None, shuffle=True):
    with temporary_seed(seed):
        samples = build_sample_array(maker, count, shuffle=shuffle)

    directory = os.path.dirname(save_path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    np.save(save_path, samples)

    print("saved npy:", save_path)
    print("shape:", samples.shape)
    return samples
