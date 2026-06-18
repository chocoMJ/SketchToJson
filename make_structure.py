import math
import random

import numpy as np

from sketch_variation import (
    SCALE,
    choose_profile,
    render_paths,
    save_samples,
    scale_points,
    transform_points,
)


IMAGE_SIZE = 28
OUTER_START_MIN = 3
OUTER_START_MAX = 7
OUTER_END_MIN = 18
OUTER_END_MAX = 24
NEW_STRUCTURE_RATIO = 0.75
CLOSED_STRUCTURE_RATIO = 0.50


def random_outer_start():
    return random.randint(OUTER_START_MIN, OUTER_START_MAX)


def random_outer_end():
    return random.randint(OUTER_END_MIN, OUTER_END_MAX)


def jitter_point(x, y, amount=1):
    return (
        max(1, min(26, x + random.randint(-amount, amount))),
        max(1, min(26, y + random.randint(-amount, amount))),
    )


def _point_bounds(points):
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return min(xs), min(ys), max(xs), max(ys)


def _valid_structure_points(points, closed):
    unique_points = points[:-1] if closed and points[0] == points[-1] else points
    if closed and len(unique_points) < 4:
        return False
    if not closed and len(unique_points) < 3:
        return False

    min_x, min_y, max_x, max_y = _point_bounds(unique_points)
    if max_x - min_x < 8 or max_y - min_y < 8:
        return False

    return True


def _make_spec(category, family, closed, points):
    if closed and points[0] != points[-1]:
        points = [*points, points[0]]

    vertex_count = len(points) - 1 if closed else len(points)
    return {
        "category": category,
        "family": family,
        "closure": "closed" if closed else "open",
        "closed": closed,
        "vertex_count": vertex_count,
        "points": points,
    }


def _render_points(points, width=None):
    profile = choose_profile()
    high_points = scale_points([jitter_point(x, y) for x, y in points])
    high_points = transform_points(
        high_points,
        scale=random.uniform(0.86, 1.06),
        shift=(random.uniform(-5, 5), random.uniform(-5, 5)),
    )
    high_width = width * SCALE if width is not None else random.randint(*profile.width_range)
    curves = [random.uniform(-profile.curve * 0.14, profile.curve * 0.14) for _ in range(len(high_points) - 1)]

    return render_paths(
        [{"points": high_points, "width": high_width, "curve_offsets": curves}],
        profile=profile,
        rotate=random.uniform(0, math.tau),
        flip_x=random.random() < 0.5,
        flip_y=random.random() < 0.5,
    )


def draw_lines(points, width=None):
    return _render_points(points, width=width)


def _radial_polygon_points(vertex_count, radius_range=(7, 13), center_jitter=3):
    center = (
        random.uniform(12 - center_jitter, 16 + center_jitter),
        random.uniform(12 - center_jitter, 16 + center_jitter),
    )
    angles = sorted(random.uniform(0, math.tau) for _ in range(vertex_count))
    points = []

    for angle in angles:
        radius = random.uniform(*radius_range)
        points.append(
            (
                max(2, min(26, center[0] + math.cos(angle) * radius)),
                max(2, min(26, center[1] + math.sin(angle) * radius)),
            )
        )

    return points


def _random_walk_points(vertex_count, step_range=(4, 9)):
    x = random.uniform(4, 24)
    y = random.uniform(4, 24)
    points = [(x, y)]
    angle = random.uniform(0, math.tau)

    for _ in range(vertex_count - 1):
        angle += random.uniform(math.radians(35), math.radians(145)) * random.choice([-1, 1])
        step = random.uniform(*step_range)
        x = max(2, min(26, x + math.cos(angle) * step))
        y = max(2, min(26, y + math.sin(angle) * step))
        points.append((x, y))

    return points


def _closed_random_polygon_spec():
    vertex_count = random.randint(4, 9)
    points = _radial_polygon_points(vertex_count)
    return _make_spec("closed_random_polygon", "new", True, points)


def _irregular_closed_room_spec():
    x1 = random.randint(2, 6)
    y1 = random.randint(2, 7)
    x2 = random.randint(20, 26)
    y2 = random.randint(19, 26)
    mid_x = random.randint(9, 18)
    mid_y = random.randint(8, 17)
    points = [
        (x1, random.randint(y1, y1 + 3)),
        (random.randint(9, 15), y1),
        (x2, random.randint(5, 11)),
        (random.randint(21, 26), mid_y),
        (x2 - random.randint(1, 6), y2),
        (mid_x, y2 - random.randint(0, 4)),
        (x1 + random.randint(0, 5), random.randint(mid_y, y2)),
    ]
    return _make_spec("irregular_closed_room", "new", True, points)


def _open_random_polyline_spec():
    vertex_count = random.randint(3, 8)
    points = _random_walk_points(vertex_count)
    return _make_spec("open_random_polyline", "new", False, points)


def _irregular_open_outline_spec():
    full = _radial_polygon_points(random.randint(5, 9), radius_range=(7, 13), center_jitter=2)
    start = random.randint(0, len(full) - 1)
    count = random.randint(3, min(7, len(full)))
    points = [full[(start + offset) % len(full)] for offset in range(count)]
    return _make_spec("irregular_open_outline", "new", False, points)


def _legacy_rectangle_spec():
    x1 = random_outer_start()
    y1 = random_outer_start()
    x2 = random_outer_end()
    y2 = random_outer_end()
    points = [(x1, y1), (x2, y1), (x2, y2), (x1, y2)]
    return _make_spec("rectangle", "legacy", True, points)


def _legacy_d_shape_spec():
    x1 = random_outer_start()
    y1 = random_outer_start()
    x2 = random_outer_end()
    y2 = random_outer_end()
    points = [(x2, y1), (x1, y1), (x1, y2), (x2, y2)]
    return _make_spec("d_shape", "legacy", False, points)


def _legacy_l_shape_spec():
    x1 = random_outer_start()
    y1 = random_outer_start()
    x2 = random_outer_end()
    y2 = random_outer_end()
    points = [(x1, y1), (x1, y2), (x2, y2)]
    return _make_spec("l_shape", "legacy", False, points)


def _legacy_concave_shape_spec():
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
    ]
    return _make_spec("concave_shape", "legacy", True, points)


def _legacy_protruded_shape_spec():
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
    ]
    return _make_spec("protruded_shape", "legacy", True, points)


def _legacy_stair_shape_spec():
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

    return _make_spec("stair_shape", "legacy", False, points)


def _legacy_irregular_room_spec():
    start = (random.randint(2, 5), random.randint(3, 8))
    points = [
        start,
        (random.randint(10, 16), random.randint(2, 6)),
        (random.randint(20, 26), random.randint(6, 12)),
        (random.randint(21, 26), random.randint(17, 25)),
        (random.randint(12, 18), random.randint(20, 26)),
        (random.randint(3, 8), random.randint(16, 24)),
    ]
    return _make_spec("irregular_room", "legacy", True, points)


def _legacy_random_polyline_spec():
    vertex_count = random.randint(3, 6)
    points = _random_walk_points(vertex_count, step_range=(4, 8))
    return _make_spec("random_polyline", "legacy", False, points)


NEW_CLOSED_MAKERS = [_closed_random_polygon_spec, _irregular_closed_room_spec]
NEW_OPEN_MAKERS = [_open_random_polyline_spec, _irregular_open_outline_spec]
LEGACY_CLOSED_MAKERS = [
    _legacy_rectangle_spec,
    _legacy_concave_shape_spec,
    _legacy_protruded_shape_spec,
    _legacy_irregular_room_spec,
]
LEGACY_OPEN_MAKERS = [
    _legacy_d_shape_spec,
    _legacy_l_shape_spec,
    _legacy_stair_shape_spec,
    _legacy_random_polyline_spec,
]


def _choose_structure_spec():
    closed = random.random() < CLOSED_STRUCTURE_RATIO
    new_family = random.random() < NEW_STRUCTURE_RATIO

    if closed and new_family:
        maker = random.choice(NEW_CLOSED_MAKERS)
    elif closed:
        maker = random.choice(LEGACY_CLOSED_MAKERS)
    elif new_family:
        maker = random.choice(NEW_OPEN_MAKERS)
    else:
        maker = random.choice(LEGACY_OPEN_MAKERS)

    for _ in range(12):
        spec = maker()
        if _valid_structure_points(spec["points"], spec["closed"]):
            return spec

    return maker()


def _render_structure_spec(spec):
    return _render_points(spec["points"])


def make_rectangle():
    return _render_structure_spec(_legacy_rectangle_spec())


def make_d_shape():
    return _render_structure_spec(_legacy_d_shape_spec())


def make_L_shape():
    return _render_structure_spec(_legacy_l_shape_spec())


def make_concave_shape():
    return _render_structure_spec(_legacy_concave_shape_spec())


def make_protruded_shape():
    return _render_structure_spec(_legacy_protruded_shape_spec())


def make_stair_shape():
    return _render_structure_spec(_legacy_stair_shape_spec())


def make_irregular_room():
    return _render_structure_spec(_legacy_irregular_room_spec())


def make_random_polyline():
    return _render_structure_spec(_legacy_random_polyline_spec())


def random_rotate_or_flip(arr):
    k = random.randint(0, 3)
    arr = np.rot90(arr, k)

    if random.random() < 0.5:
        arr = np.fliplr(arr)

    if random.random() < 0.5:
        arr = np.flipud(arr)

    return arr.copy()


def make_structure_sample():
    return _render_structure_spec(_choose_structure_spec())


def make_structure_npy(save_path="data_polygon/structure.npy", count=500000, seed=None):
    return save_samples(save_path, make_structure_sample, count, seed=seed)


if __name__ == "__main__":
    make_structure_npy("data_polygon/structure.npy", count=500000)
