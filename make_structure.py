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
HARD_STRUCTURE_RATIO = 0.20


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


def _make_path(points, width=None, allow_gap=True, curve_scale=0.14):
    return {
        "points": points,
        "width": width,
        "allow_gap": allow_gap,
        "curve_scale": curve_scale,
    }


def _flatten_paths(paths):
    points = []
    for path in paths:
        points.extend(path["points"])
    return points


def _make_multi_path_spec(category, family, closed, paths, points=None):
    return {
        **_make_spec(category, family, closed, points or _flatten_paths(paths)),
        "paths": paths,
    }


def _render_path_collection(paths, width=None):
    profile = choose_profile()
    scale = random.uniform(0.86, 1.06)
    shift = (random.uniform(-5, 5), random.uniform(-5, 5))
    rendered_paths = []

    for path in paths:
        path_width = path.get("width", width)
        high_points = scale_points([jitter_point(x, y) for x, y in path["points"]])
        high_points = transform_points(high_points, scale=scale, shift=shift)
        high_width = path_width * SCALE if path_width is not None else random.randint(*profile.width_range)
        curve_scale = path.get("curve_scale", 0.14)
        curves = [
            random.uniform(-profile.curve * curve_scale, profile.curve * curve_scale)
            for _ in range(len(high_points) - 1)
        ]
        rendered_paths.append(
            {
                "points": high_points,
                "width": high_width,
                "curve_offsets": curves,
                "allow_gap": path.get("allow_gap", True),
            }
        )

    return render_paths(
        rendered_paths,
        profile=profile,
        rotate=random.uniform(0, math.tau),
        flip_x=random.random() < 0.5,
        flip_y=random.random() < 0.5,
    )


def _render_points(points, width=None):
    return _render_path_collection([_make_path(points, width=width)])


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


def _cross_like_structure_spec():
    cx = random.uniform(11, 17)
    cy = random.uniform(11, 17)
    left = random.uniform(2, 6)
    right = random.uniform(20, 26)
    top = random.uniform(2, 7)
    bottom = random.uniform(20, 26)
    offset = random.uniform(-2.5, 2.5)
    mode = random.choice(["t_junction", "offset_cross", "kinked_cross"])

    if mode == "t_junction":
        main = [(left, cy + random.uniform(-1, 1)), (cx, cy), (right, cy + random.uniform(-1, 1))]
        branch = [(cx + offset, top), (cx, cy)]
        paths = [_make_path(main), _make_path(branch)]
    elif mode == "offset_cross":
        main = [(left, cy), (cx, cy), (right, cy + random.uniform(-1.5, 1.5))]
        branch = [(cx + offset, top), (cx, cy), (cx - offset * 0.45, bottom)]
        tail = [(cx, cy), (cx + random.uniform(3, 6), cy + random.uniform(3, 6))]
        paths = [_make_path(main), _make_path(branch), _make_path(tail)]
    else:
        main = [(left, cy), (cx - 1.5, cy + random.uniform(-2, 2)), (right, cy + random.uniform(-2, 2))]
        branch = [(cx + offset, top), (cx, cy), (cx + random.uniform(-2, 2), bottom)]
        paths = [_make_path(main), _make_path(branch)]

    return _make_multi_path_spec("cross_like_structure", "hard", False, paths)


def _junction_structure_spec():
    cx = random.uniform(10, 18)
    cy = random.uniform(10, 18)
    ray_count = random.randint(3, 4)
    base = random.uniform(0, math.tau)
    paths = []

    for index in range(ray_count):
        angle = base + index * math.tau / ray_count + random.uniform(-0.42, 0.42)
        length = random.uniform(7, 13)
        end = (
            max(2, min(26, cx + math.cos(angle) * length)),
            max(2, min(26, cy + math.sin(angle) * length)),
        )
        if random.random() < 0.45:
            mid = (
                cx + math.cos(angle) * length * random.uniform(0.35, 0.6) + random.uniform(-1.5, 1.5),
                cy + math.sin(angle) * length * random.uniform(0.35, 0.6) + random.uniform(-1.5, 1.5),
            )
            paths.append(_make_path([(cx, cy), mid, end]))
        else:
            paths.append(_make_path([(cx, cy), end]))

    return _make_multi_path_spec("junction_structure", "hard", False, paths)


def _room_with_internal_wall_spec():
    x1 = random.randint(2, 6)
    y1 = random.randint(2, 6)
    x2 = random.randint(21, 26)
    y2 = random.randint(21, 26)
    skew = random.randint(-2, 2)
    outer = [
        (x1, y1 + random.randint(0, 2)),
        (x2 + skew, y1),
        (x2, y2 + random.randint(-1, 1)),
        (x1 + random.randint(-1, 1), y2),
    ]
    outer_closed = [*outer, outer[0]]
    cx = random.randint(x1 + 6, x2 - 5)
    cy = random.randint(y1 + 6, y2 - 5)

    if random.random() < 0.5:
        first_wall = [(cx, y1 + random.randint(1, 4)), (cx + random.randint(-1, 1), y2 - random.randint(1, 4))]
        second_wall = [(x1 + random.randint(2, 5), cy), (cx, cy), (x2 - random.randint(2, 5), cy + random.randint(-1, 1))]
    else:
        first_wall = [(x1 + random.randint(2, 5), cy), (x2 - random.randint(2, 5), cy + random.randint(-1, 1))]
        second_wall = [(cx, y1 + random.randint(1, 4)), (cx, cy), (cx + random.randint(-1, 1), y2 - random.randint(1, 4))]

    paths = [
        _make_path(outer_closed),
        _make_path(first_wall),
        _make_path(second_wall),
    ]
    return _make_multi_path_spec("room_with_internal_wall", "hard", True, paths, points=outer)


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
HARD_CLOSED_MAKERS = [_room_with_internal_wall_spec]
HARD_OPEN_MAKERS = [_cross_like_structure_spec, _junction_structure_spec]


def _choose_structure_spec():
    hard_family = random.random() < HARD_STRUCTURE_RATIO
    closed = random.random() < CLOSED_STRUCTURE_RATIO

    if hard_family:
        makers = HARD_CLOSED_MAKERS if closed else HARD_OPEN_MAKERS
        maker = random.choice(makers)
    else:
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
    if "paths" in spec:
        return _render_path_collection(spec["paths"])

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
