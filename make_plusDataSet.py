import math
import random

from sketch_variation import CANVAS_SIZE, choose_profile, point_from, render_paths, save_samples


def _line_angle_delta(first, second):
    delta = abs((first - second + math.pi) % math.tau - math.pi)
    return min(delta, math.pi - delta)


def _plus_arm_lengths(params):
    return [
        params["first_length"] * params["first_ratio"],
        params["first_length"] * (1 - params["first_ratio"]),
        params["second_length"] * params["second_ratio"],
        params["second_length"] * (1 - params["second_ratio"]),
    ]


def _valid_plus_params(params):
    crossing_angle = _line_angle_delta(params["base_angle"], params["cross_angle"])
    if crossing_angle < math.radians(65):
        return False

    arms = _plus_arm_lengths(params)
    if min(arms) < 16:
        return False

    longer = max(params["first_length"], params["second_length"])
    shorter = min(params["first_length"], params["second_length"])
    return shorter / longer >= 0.68


def _sample_plus_params(profile=None):
    profile = profile or choose_profile()

    if profile.name == "boundary":
        angle_range = (65, 115)
        ratio_range = (0.30, 0.70)
        length_range = (60, 104)
    elif profile.name == "strong":
        angle_range = (70, 110)
        ratio_range = (0.32, 0.68)
        length_range = (64, 100)
    else:
        angle_range = (78, 102)
        ratio_range = (0.38, 0.62)
        length_range = (70, 96)

    for _ in range(16):
        angle_between = math.radians(random.uniform(*angle_range))
        base_angle = random.uniform(0, math.tau)
        center = (
            CANVAS_SIZE / 2 + random.uniform(-8, 8),
            CANVAS_SIZE / 2 + random.uniform(-8, 8),
        )
        params = {
            "profile": profile,
            "center": center,
            "base_angle": base_angle,
            "cross_angle": base_angle + angle_between,
            "first_length": random.uniform(*length_range),
            "second_length": random.uniform(*length_range),
            "first_ratio": random.uniform(*ratio_range),
            "second_ratio": random.uniform(*ratio_range),
        }
        if _valid_plus_params(params):
            return params

    return {
        "profile": profile,
        "center": (CANVAS_SIZE / 2, CANVAS_SIZE / 2),
        "base_angle": 0,
        "cross_angle": math.pi / 2,
        "first_length": sum(length_range) / 2,
        "second_length": sum(length_range) / 2,
        "first_ratio": 0.5,
        "second_ratio": 0.5,
    }


def _crossing_line(center, angle, total_length, ratio):
    backward = total_length * ratio
    forward = total_length * (1 - ratio)
    return point_from(center, angle + math.pi, backward), point_from(center, angle, forward)


def make_plus():
    params = _sample_plus_params()
    profile = params["profile"]
    width = random.randint(*profile.width_range)

    first = _crossing_line(params["center"], params["base_angle"], params["first_length"], params["first_ratio"])
    second = _crossing_line(params["center"], params["cross_angle"], params["second_length"], params["second_ratio"])

    paths = [
        {
            "points": list(first),
            "width": width,
            "curve_offsets": [random.uniform(-profile.curve * 0.15, profile.curve * 0.15)],
            "allow_gap": False,
        },
        {
            "points": list(second),
            "width": max(1, width + random.randint(-1, 1)),
            "curve_offsets": [random.uniform(-profile.curve * 0.15, profile.curve * 0.15)],
            "allow_gap": False,
        },
    ]

    return render_paths(paths, profile=profile)


def make_plus_sample():
    return make_plus()


def make_plus_npy(save_path="data_polygon/plus.npy", count=100000, seed=None):
    return save_samples(save_path, make_plus_sample, count, seed=seed)


if __name__ == "__main__":
    make_plus_npy("data_polygon/plus.npy", count=100000)
