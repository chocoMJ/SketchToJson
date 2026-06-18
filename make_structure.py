import math
import random
import time
from collections import deque

import numpy as np

from sketch_variation import (
    SCALE,
    choose_profile,
    render_paths,
    rotate_points,
    save_samples,
    scale_points,
    transform_points,
    validate_sample,
)


IMAGE_SIZE = 28
SAFE_MIN = 2
SAFE_MAX = 26
OUTER_MIN_SIZE = 16
MIN_PASSAGE = 3
MIN_SPAN = 8
OPEN_STRUCTURE_RATIO = 0.25
NOTCH_COUNTS = (0, 1, 2, 3)
NOTCH_COUNT_WEIGHTS = (0.20, 0.35, 0.30, 0.15)
NOTCH_SIZE_RULES = (
    ("small", 0.35, (3, 5), (3, 5)),
    ("medium", 0.45, (5, 9), (4, 8)),
    ("large", 0.20, (8, 14), (6, 12)),
)
SPEC_ATTEMPTS = 200
NOTCH_ATTEMPTS = 30
SKEW_RANGE = (-0.08, 0.08)
EPSILON = 1e-9
CANVAS_SIZE = IMAGE_SIZE * SCALE
STRUCTURE_VARIATION_STRENGTH = "strong"
STRUCTURE_FIT_MARGIN_PIXELS = 1
STRUCTURE_RENDER_ATTEMPTS = 12
STRUCTURE_VERTEX_OFFSET_RANGES = {
    "light": (0.32, 0.95),
    "medium": (0.40, 1.30),
    "strong": (0.55, 1.65),
    "boundary": (0.70, 1.85),
}
STRUCTURE_MIDPOINT_JIGGLE_RANGES = {
    "light": (0.25, 0.70),
    "medium": (0.40, 1.15),
    "strong": (0.55, 1.55),
    "boundary": (0.70, 1.90),
}
STRUCTURE_CURVE_SCALE = 0.10


def _orientation(a, b, c):
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def _segments_properly_cross(first, second):
    a, b = first
    c, d = second
    first_side = _orientation(a, b, c)
    second_side = _orientation(a, b, d)
    third_side = _orientation(c, d, a)
    fourth_side = _orientation(c, d, b)

    return (
        first_side * second_side < -EPSILON
        and third_side * fourth_side < -EPSILON
    )


def _spec_has_segment_crossing(spec):
    segments = spec["segments"]
    for first_index, first_segment in enumerate(segments):
        for second_segment in segments[first_index + 1:]:
            if _segments_properly_cross(first_segment, second_segment):
                return True
    return False


def _segments_are_axis_aligned(segments):
    return all(start[0] == end[0] or start[1] == end[1] for start, end in segments)


def _point_bounds(points):
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return min(xs), min(ys), max(xs), max(ys)


def _in_safe_bounds(point):
    x, y = point
    return SAFE_MIN <= x <= SAFE_MAX and SAFE_MIN <= y <= SAFE_MAX


def _clamp_to_safe(point):
    x, y = point
    return (
        max(SAFE_MIN, min(SAFE_MAX, x)),
        max(SAFE_MIN, min(SAFE_MAX, y)),
    )


def _make_path(points, width=None, allow_gap=True, curve_scale=0.08):
    return {
        "points": points,
        "width": width,
        "allow_gap": allow_gap,
        "curve_scale": curve_scale,
    }


def _sample_outer_rect():
    width = random.randint(OUTER_MIN_SIZE, SAFE_MAX - SAFE_MIN)
    height = random.randint(OUTER_MIN_SIZE, SAFE_MAX - SAFE_MIN)
    x1 = random.randint(SAFE_MIN, SAFE_MAX - width)
    y1 = random.randint(SAFE_MIN, SAFE_MAX - height)
    return x1, y1, x1 + width, y1 + height


def _sample_notch_count():
    return random.choices(NOTCH_COUNTS, weights=NOTCH_COUNT_WEIGHTS, k=1)[0]


def _sample_size_value(size_range, cap):
    low, high = size_range
    if cap < low:
        return None
    return random.randint(low, min(high, cap))


def _sample_notch_size(span, depth_span):
    bucket, _, length_range, depth_range = random.choices(
        NOTCH_SIZE_RULES,
        weights=[rule[1] for rule in NOTCH_SIZE_RULES],
        k=1,
    )[0]
    length = _sample_size_value(length_range, span - MIN_PASSAGE)
    depth = _sample_size_value(depth_range, depth_span - MIN_PASSAGE)
    if length is None or depth is None:
        return None
    return bucket, length, depth


def _sample_notch(outer_rect):
    x1, y1, x2, y2 = outer_rect
    width = x2 - x1
    height = y2 - y1
    side = random.choice(("top", "right", "bottom", "left"))

    if side in {"top", "bottom"}:
        sampled = _sample_notch_size(width, height)
        if sampled is None:
            return None
        bucket, length, depth = sampled
        start = random.randint(x1, x2 - length)
        if side == "top":
            rect = (start, y1, start + length, y1 + depth)
        else:
            rect = (start, y2 - depth, start + length, y2)
    else:
        sampled = _sample_notch_size(height, width)
        if sampled is None:
            return None
        bucket, length, depth = sampled
        start = random.randint(y1, y2 - length)
        if side == "left":
            rect = (x1, start, x1 + depth, start + length)
        else:
            rect = (x2 - depth, start, x2, start + length)

    return {
        "side": side,
        "start": start,
        "length": length,
        "depth": depth,
        "bucket": bucket,
        "rect": rect,
    }


def _build_mask(outer_rect, notches):
    x1, y1, x2, y2 = outer_rect
    mask = np.zeros((IMAGE_SIZE, IMAGE_SIZE), dtype=bool)
    mask[y1:y2, x1:x2] = True

    for notch in notches:
        nx1, ny1, nx2, ny2 = notch["rect"]
        mask[ny1:ny2, nx1:nx2] = False

    return mask


def _mask_is_connected(mask):
    cells = np.argwhere(mask)
    if len(cells) == 0:
        return False

    start_y, start_x = (int(cells[0][0]), int(cells[0][1]))
    queue = deque([(start_x, start_y)])
    seen = {(start_x, start_y)}

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < IMAGE_SIZE and 0 <= ny < IMAGE_SIZE and mask[ny, nx] and (nx, ny) not in seen:
                seen.add((nx, ny))
                queue.append((nx, ny))

    return len(seen) == int(mask.sum())


def _all_runs_meet_min_width(mask):
    for row in mask:
        run = 0
        for value in list(row) + [False]:
            if value:
                run += 1
            elif run:
                if run < MIN_PASSAGE:
                    return False
                run = 0

    for column in mask.T:
        run = 0
        for value in list(column) + [False]:
            if value:
                run += 1
            elif run:
                if run < MIN_PASSAGE:
                    return False
                run = 0

    return True


def _boundary_edges(mask):
    edges = set()

    for y in range(IMAGE_SIZE):
        for x in range(IMAGE_SIZE):
            if not mask[y, x]:
                continue
            if y == 0 or not mask[y - 1, x]:
                edges.add(((x, y), (x + 1, y)))
            if x == IMAGE_SIZE - 1 or not mask[y, x + 1]:
                edges.add(((x + 1, y), (x + 1, y + 1)))
            if y == IMAGE_SIZE - 1 or not mask[y + 1, x]:
                edges.add(((x + 1, y + 1), (x, y + 1)))
            if x == 0 or not mask[y, x - 1]:
                edges.add(((x, y + 1), (x, y)))

    return edges


def _ordered_boundary_points(mask):
    edges = _boundary_edges(mask)
    if not edges:
        return None

    adjacency = {}
    for start, end in edges:
        adjacency.setdefault(start, []).append(end)
        adjacency.setdefault(end, []).append(start)

    if any(len(neighbors) != 2 for neighbors in adjacency.values()):
        return None

    start = min(adjacency)
    previous = None
    current = start
    points = [start]
    visited_edges = set()

    while True:
        neighbors = adjacency[current]
        next_point = neighbors[0] if neighbors[0] != previous else neighbors[1]
        edge_key = frozenset((current, next_point))
        if edge_key in visited_edges:
            return None

        visited_edges.add(edge_key)
        if next_point == start:
            points.append(start)
            break

        previous, current = current, next_point
        points.append(current)
        if len(points) > len(edges) + 1:
            return None

    if len(visited_edges) != len(edges):
        return None

    return points


def _is_collinear(previous, current, next_point):
    return (
        previous[0] == current[0] == next_point[0]
        or previous[1] == current[1] == next_point[1]
    )


def _simplify_closed_points(points):
    ring = points[:-1]
    simplified = []

    for index, point in enumerate(ring):
        previous = ring[index - 1]
        next_point = ring[(index + 1) % len(ring)]
        if _is_collinear(previous, point, next_point):
            continue
        simplified.append(point)

    if len(simplified) < 4:
        return None

    return [*simplified, simplified[0]]


def _segment_length(first, second):
    return abs(first[0] - second[0]) + abs(first[1] - second[1])


def _make_open_points(closed_points):
    ring = closed_points[:-1]
    eligible = [
        index
        for index, point in enumerate(ring)
        if _segment_length(point, ring[(index + 1) % len(ring)]) >= MIN_PASSAGE
    ]
    if not eligible:
        return closed_points, None

    index = random.choice(eligible)
    next_index = (index + 1) % len(ring)
    open_points = ring[next_index:] + ring[: index + 1]
    removed_edge = (ring[index], ring[next_index])
    return open_points, removed_edge


def _segments_from_points(points):
    return list(zip(points, points[1:]))


def _mask_has_min_span(mask):
    cells = np.argwhere(mask)
    ys = cells[:, 0]
    xs = cells[:, 1]
    return xs.max() - xs.min() + 1 >= MIN_SPAN and ys.max() - ys.min() + 1 >= MIN_SPAN


def _mask_is_valid(mask):
    return (
        _mask_is_connected(mask)
        and _all_runs_meet_min_width(mask)
        and _mask_has_min_span(mask)
        and _ordered_boundary_points(mask) is not None
    )


def _make_rectangle_notch_spec(points, segments, outer_rect, notches, closed, removed_edge):
    return {
        "category": "rectangle_notch_structure",
        "family": "rectangle_notch",
        "closure": "closed" if closed else "open",
        "closed": closed,
        "vertex_count": len(points) - 1 if closed else len(points),
        "segment_count": len(segments),
        "stroke_variant": "single",
        "outer_rect": outer_rect,
        "notch_count": len(notches),
        "notches": notches,
        "removed_edge": removed_edge,
        "points": points,
        "segments": segments,
        "paths": [_make_path(points)],
    }


def _valid_rectangle_notch_spec(spec):
    if spec["notch_count"] not in NOTCH_COUNTS:
        return False
    if any(not _in_safe_bounds(point) for point in spec["points"]):
        return False
    if not _segments_are_axis_aligned(spec["segments"]):
        return False
    if _spec_has_segment_crossing(spec):
        return False

    min_x, min_y, max_x, max_y = _point_bounds(spec["points"])
    if max_x - min_x < MIN_SPAN or max_y - min_y < MIN_SPAN:
        return False

    return True


def _rectangle_notch_structure_spec():
    target_notch_count = _sample_notch_count()

    for _ in range(SPEC_ATTEMPTS):
        outer_rect = _sample_outer_rect()
        notches = []

        for _ in range(target_notch_count):
            notch = None
            for _ in range(NOTCH_ATTEMPTS):
                notch = _sample_notch(outer_rect)
                if notch is not None:
                    break
            if notch is None:
                notches = None
                break
            notches.append(notch)

        if notches is None:
            continue

        mask = _build_mask(outer_rect, notches)
        if not _mask_is_valid(mask):
            continue

        boundary_points = _ordered_boundary_points(mask)
        closed_points = _simplify_closed_points(boundary_points)
        if closed_points is None:
            continue

        closed = random.random() >= OPEN_STRUCTURE_RATIO
        removed_edge = None
        points = closed_points
        if not closed:
            points, removed_edge = _make_open_points(closed_points)
            closed = False

        segments = _segments_from_points(points)
        spec = _make_rectangle_notch_spec(points, segments, outer_rect, notches, closed, removed_edge)
        if _valid_rectangle_notch_spec(spec):
            return spec

    return _fallback_rectangle_spec() if target_notch_count == 0 else _fallback_notched_spec(target_notch_count)


def _fallback_rectangle_spec():
    outer_rect = (4, 4, 24, 24)
    points = [(4, 4), (24, 4), (24, 24), (4, 24), (4, 4)]
    segments = _segments_from_points(points)
    return _make_rectangle_notch_spec(points, segments, outer_rect, [], True, None)


def _fallback_notched_spec(notch_count):
    outer_rect = (4, 4, 24, 24)
    notches = [
        {
            "side": "top",
            "start": 10,
            "length": 6,
            "depth": 5,
            "bucket": "medium",
            "rect": (10, 4, 16, 9),
        },
        {
            "side": "right",
            "start": 12,
            "length": 6,
            "depth": 4,
            "bucket": "medium",
            "rect": (20, 12, 24, 18),
        },
        {
            "side": "bottom",
            "start": 7,
            "length": 5,
            "depth": 4,
            "bucket": "small",
            "rect": (7, 20, 12, 24),
        },
    ][:notch_count]
    mask = _build_mask(outer_rect, notches)
    points = _simplify_closed_points(_ordered_boundary_points(mask))
    segments = _segments_from_points(points)
    return _make_rectangle_notch_spec(points, segments, outer_rect, notches, True, None)


def _choose_structure_spec():
    return _rectangle_notch_structure_spec()


def _skew_points(points):
    shear_x = random.uniform(*SKEW_RANGE)
    shear_y = random.uniform(*SKEW_RANGE)
    center = IMAGE_SIZE * SCALE / 2
    skewed = []

    for x, y in points:
        dx = x - center
        dy = y - center
        skewed.append((x + dy * shear_x, y + dx * shear_y))

    return skewed


def _profile_range(ranges, profile):
    return ranges.get(profile.name, ranges["medium"])


def _sample_offset(offset_range):
    distance = random.uniform(*offset_range)
    angle = random.uniform(0, math.tau)
    return math.cos(angle) * distance, math.sin(angle) * distance


def _apply_structure_vertex_offsets(points, profile):
    if not points:
        return []

    closed = len(points) > 1 and points[0] == points[-1]
    source_points = points[:-1] if closed else points
    offset_range = _profile_range(STRUCTURE_VERTEX_OFFSET_RANGES, profile)
    adjusted = []

    for x, y in source_points:
        dx, dy = _sample_offset(offset_range)
        adjusted.append((x + dx, y + dy))

    if closed and adjusted:
        adjusted.append(adjusted[0])

    return adjusted


def _add_structure_jiggle_points(points, profile):
    if len(points) < 2:
        return points[:]

    closed = points[0] == points[-1]
    jiggle_range = _profile_range(STRUCTURE_MIDPOINT_JIGGLE_RANGES, profile)
    adjusted = [points[0]]

    for start, end in zip(points, points[1:]):
        sx, sy = start
        ex, ey = end
        dx = ex - sx
        dy = ey - sy
        length = math.hypot(dx, dy)

        if length > EPSILON:
            control_count = 2 if length >= 8 and random.random() < 0.65 else 1
            normal_x = -dy / length
            normal_y = dx / length

            for control_index in range(control_count):
                progress = (control_index + 1) / (control_count + 1)
                midpoint_x = sx + dx * progress
                midpoint_y = sy + dy * progress
                distance = random.uniform(*jiggle_range) * random.choice((-1, 1))
                adjusted.append(
                    (
                        midpoint_x + normal_x * distance,
                        midpoint_y + normal_y * distance,
                    )
                )

        adjusted.append(end)

    if closed:
        adjusted[-1] = adjusted[0]

    return adjusted


def _structure_width_variation(profile):
    return min(0.62, profile.width_variation * 1.45 + 0.08)


def _flip_points(points, flip_x, flip_y):
    flipped = []

    for x, y in points:
        if flip_x:
            x = CANVAS_SIZE - x
        if flip_y:
            y = CANVAS_SIZE - y
        flipped.append((x, y))

    return flipped


def _flatten_path_points(paths):
    return [point for path in paths for point in path["points"]]


def _point_bbox(points):
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return min(xs), min(ys), max(xs), max(ys)


def _structure_fit_padding(profile, widths, width_variation):
    max_width = max(widths) if widths else max(profile.width_range)
    stroke_radius = max_width * (1 + width_variation) / 2
    hand_margin = profile.wave + profile.jitter + profile.curve * STRUCTURE_CURVE_SCALE
    return STRUCTURE_FIT_MARGIN_PIXELS * SCALE + stroke_radius + hand_margin + 2


def _fit_rendered_paths_to_canvas(paths, padding):
    all_points = _flatten_path_points(paths)
    min_x, min_y, max_x, max_y = _point_bbox(all_points)
    width = max(EPSILON, max_x - min_x)
    height = max(EPSILON, max_y - min_y)
    available = max(1.0, CANVAS_SIZE - padding * 2)
    fit_scale = min(1.0, available / width, available / height)
    bbox_center_x = (min_x + max_x) / 2
    bbox_center_y = (min_y + max_y) / 2
    target_center = CANVAS_SIZE / 2
    fit_shift = (
        target_center - bbox_center_x * fit_scale,
        target_center - bbox_center_y * fit_scale,
    )

    fitted_paths = []
    for path in paths:
        fitted_path = {**path}
        fitted_path["points"] = [
            (x * fit_scale + fit_shift[0], y * fit_scale + fit_shift[1])
            for x, y in path["points"]
        ]
        fitted_paths.append(fitted_path)

    return fitted_paths, {
        "fit_scale": fit_scale,
        "fit_shift": fit_shift,
        "fit_padding": padding,
        "prefit_bbox": (min_x, min_y, max_x, max_y),
    }


def _edge_ink_count(arr, margin_pixels=STRUCTURE_FIT_MARGIN_PIXELS):
    mask = arr > 24
    border = np.zeros(mask.shape, dtype=bool)
    border[:margin_pixels, :] = True
    border[-margin_pixels:, :] = True
    border[:, :margin_pixels] = True
    border[:, -margin_pixels:] = True
    return int(mask[border].sum())


def _structure_sample_is_valid(sample):
    return (
        validate_sample(sample, min_pixels=8, max_edge_fraction=0.75)
        and _edge_ink_count(sample) == 0
    )


def _structure_render_metadata(profile, scale, rotation, fit_metadata, path_metadata, sample=None):
    edge_ink_count = _edge_ink_count(sample) if sample is not None else None
    return {
        "profile": profile.name,
        "variation_strength": STRUCTURE_VARIATION_STRENGTH,
        "vertex_offset_range": _profile_range(STRUCTURE_VERTEX_OFFSET_RANGES, profile),
        "midpoint_jiggle_range": _profile_range(STRUCTURE_MIDPOINT_JIGGLE_RANGES, profile),
        "width_variation": _structure_width_variation(profile),
        "scale": scale,
        "rotation": rotation,
        "fit_scale": fit_metadata["fit_scale"],
        "fit_shift": fit_metadata["fit_shift"],
        "fit_padding": fit_metadata["fit_padding"],
        "prefit_bbox": fit_metadata["prefit_bbox"],
        "margin_pixels": STRUCTURE_FIT_MARGIN_PIXELS,
        "edge_ink_count": edge_ink_count,
        "paths": path_metadata,
    }


def _make_rendered_structure_paths(paths, width, profile):
    scale = random.uniform(0.86, 1.06)
    rotation = random.uniform(0, math.tau)
    flip_x = random.random() < 0.5
    flip_y = random.random() < 0.5
    rendered_paths = []
    path_metadata = []
    widths = []
    width_variation = _structure_width_variation(profile)

    for path in paths:
        path_width = path.get("width", width)
        logical_points = [_clamp_to_safe(point) for point in path["points"]]
        render_points = _apply_structure_vertex_offsets(logical_points, profile)
        render_points = _add_structure_jiggle_points(render_points, profile)
        preserve_closed_endpoint = len(render_points) > 1 and render_points[0] == render_points[-1]
        high_points = scale_points(render_points)
        high_points = _skew_points(high_points)
        high_points = transform_points(high_points, scale=scale)
        high_points = _flip_points(high_points, flip_x, flip_y)
        high_points = rotate_points(high_points, rotation)
        high_width = path_width * SCALE if path_width is not None else random.randint(*profile.width_range)
        widths.append(high_width)
        curve_scale = path.get("curve_scale", STRUCTURE_CURVE_SCALE)
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
                "width_variation": path.get("width_variation", width_variation),
                "preserve_closed_endpoint": preserve_closed_endpoint,
            }
        )
        path_metadata.append(
            {
                "logical_point_count": len(logical_points),
                "render_point_count": len(render_points),
                "closed_endpoint_preserved": preserve_closed_endpoint,
                "width_variation": path.get("width_variation", width_variation),
            }
        )

    padding = _structure_fit_padding(profile, widths, width_variation)
    fitted_paths, fit_metadata = _fit_rendered_paths_to_canvas(rendered_paths, padding)
    metadata = _structure_render_metadata(profile, scale, rotation, fit_metadata, path_metadata)
    metadata["flip_x"] = flip_x
    metadata["flip_y"] = flip_y
    return fitted_paths, metadata


def _render_path_collection_once(paths, width, profile):
    rendered_paths, metadata = _make_rendered_structure_paths(paths, width, profile)
    sample = render_paths(
        rendered_paths,
        profile=profile,
        rotate=0.0,
        flip_x=False,
        flip_y=False,
        attempts=1,
    )
    metadata["edge_ink_count"] = _edge_ink_count(sample)
    return sample, metadata


def _render_path_collection(paths, width=None, return_metadata=False):
    profile = choose_profile()
    best_sample = None
    best_metadata = None
    best_score = None

    for attempt in range(STRUCTURE_RENDER_ATTEMPTS):
        sample, metadata = _render_path_collection_once(paths, width, profile)
        metadata["render_attempts"] = attempt + 1
        valid_sample = validate_sample(sample, min_pixels=8, max_edge_fraction=0.75)
        score = (valid_sample, metadata["edge_ink_count"] == 0, -metadata["edge_ink_count"], int((sample > 24).sum()))

        if best_score is None or score > best_score:
            best_sample = sample
            best_metadata = metadata
            best_score = score

        if _structure_sample_is_valid(sample):
            best_sample = sample
            best_metadata = metadata
            break

    if return_metadata:
        return best_sample, best_metadata

    return best_sample


def _render_structure_spec(spec, return_metadata=False):
    return _render_path_collection(spec["paths"], return_metadata=return_metadata)


def _render_points(points, width=None):
    return _render_path_collection([_make_path(points, width=width)])


def draw_lines(points, width=None):
    return _render_points(points, width=width)


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
    selected_seed = int(time.time() * 1000) if seed is None else seed
    print("structure seed:", selected_seed, flush=True)
    return save_samples(save_path, make_structure_sample, count, seed=selected_seed)


if __name__ == "__main__":
    make_structure_npy("data_polygon/structure.npy", count=500000)
