import math
import random

from sketch_variation import CANVAS_SIZE, choose_profile, normal, point_from, render_paths, save_samples, unit


HASH_RULES = {
    "light": {
        "angle_between": (75, 105),
        "parallel_jitter": 3,
        "gap": (26, 44),
        "length": (68, 96),
        "stagger": 3,
        "endpoint_jitter": 1.5,
        "curve_scale": 0.10,
    },
    "medium": {
        "angle_between": (75, 105),
        "parallel_jitter": 3,
        "gap": (26, 44),
        "length": (68, 96),
        "stagger": 4,
        "endpoint_jitter": 2.0,
        "curve_scale": 0.12,
    },
    "strong": {
        "angle_between": (68, 112),
        "parallel_jitter": 5,
        "gap": (24, 48),
        "length": (64, 100),
        "stagger": 5,
        "endpoint_jitter": 3.0,
        "curve_scale": 0.15,
    },
    "boundary": {
        "angle_between": (62, 118),
        "parallel_jitter": 7,
        "gap": (22, 52),
        "length": (60, 104),
        "stagger": 6,
        "endpoint_jitter": 4.0,
        "curve_scale": 0.18,
    },
}


def _angle_delta(first, second):
    return abs((first - second + math.pi) % math.tau - math.pi)


def _line_from_center(center, angle, length):
    half = length / 2
    return point_from(center, angle + math.pi, half), point_from(center, angle, half)


def _jitter_endpoint(point, line_angle, amount):
    tx, ty = unit(line_angle)
    nx, ny = normal(line_angle)
    along = random.uniform(-amount, amount)
    across = random.uniform(-amount, amount)
    return point[0] + tx * along + nx * across, point[1] + ty * along + ny * across


def _sample_hash_params(profile=None):
    profile = profile or choose_profile()
    rules = HASH_RULES[profile.name]
    width = random.randint(*profile.width_range)
    gap = max(random.uniform(*rules["gap"]), width * 2.8)
    base_angle = random.uniform(0, math.tau)
    angle_between = math.radians(random.uniform(*rules["angle_between"]))
    cross_angle = base_angle + angle_between
    center = (
        CANVAS_SIZE / 2 + random.uniform(-5, 5),
        CANVAS_SIZE / 2 + random.uniform(-5, 5),
    )

    return {
        "profile": profile,
        "rules": rules,
        "width": width,
        "center": center,
        "gap": gap,
        "base_angle": base_angle,
        "cross_angle": cross_angle,
        "angle_between": angle_between,
    }


def _build_hash_paths(profile=None):
    params = _sample_hash_params(profile)
    profile = params["profile"]
    rules = params["rules"]
    width = params["width"]
    paths = []
    pairs = []

    for pair_index, pair_angle in enumerate((params["base_angle"], params["cross_angle"])):
        nx, ny = normal(pair_angle)
        tx, ty = unit(pair_angle)
        pair_delta = math.radians(random.uniform(-rules["parallel_jitter"], rules["parallel_jitter"]))
        line_angles = (pair_angle - pair_delta / 2, pair_angle + pair_delta / 2)
        lines = []

        for side, line_angle in zip((-1, 1), line_angles):
            stagger = random.uniform(-rules["stagger"], rules["stagger"])
            line_center = (
                params["center"][0] + nx * params["gap"] * side / 2 + tx * stagger,
                params["center"][1] + ny * params["gap"] * side / 2 + ty * stagger,
            )
            start, end = _line_from_center(line_center, line_angle, random.uniform(*rules["length"]))
            start = _jitter_endpoint(start, line_angle, rules["endpoint_jitter"])
            end = _jitter_endpoint(end, line_angle, rules["endpoint_jitter"])
            curve = random.uniform(-profile.curve * rules["curve_scale"], profile.curve * rules["curve_scale"])
            path = {"points": [start, end], "width": width, "curve_offsets": [curve]}
            paths.append(path)
            lines.append(
                {
                    "angle": line_angle,
                    "center": line_center,
                    "side": side,
                    "path": path,
                }
            )

        pairs.append(
            {
                "index": pair_index,
                "angle": pair_angle,
                "normal": (nx, ny),
                "tangent": (tx, ty),
                "lines": lines,
            }
        )

    geometry = {**params, "pairs": pairs}
    return geometry, paths


def make_hash():
    geometry, paths = _build_hash_paths()
    return render_paths(paths, profile=geometry["profile"])



def make_hash_sample():
    return make_hash()


def make_hash_npy(save_path="data_polygon/hash.npy", count=100000, seed=None):
    return save_samples(save_path, make_hash_sample, count, seed=seed)


if __name__ == "__main__":
    make_hash_npy("data_polygon/hash.npy", count=100000)
