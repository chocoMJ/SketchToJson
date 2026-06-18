import math
import random

from sketch_variation import CANVAS_SIZE, choose_profile, point_from, render_paths, save_samples


def _sample_plus_params(profile=None):
    profile = profile or choose_profile()

    if profile.name == "boundary":
        angle_between = math.radians(random.uniform(50, 130))
        ratio_range = (0.22, 0.78)
        length_range = (54, 108)
    elif profile.name == "strong":
        angle_between = math.radians(random.uniform(62, 118))
        ratio_range = (0.28, 0.72)
        length_range = (62, 102)
    else:
        angle_between = math.radians(random.uniform(76, 104))
        ratio_range = (0.35, 0.65)
        length_range = (70, 96)

    base_angle = random.uniform(0, math.tau)
    center = (
        CANVAS_SIZE / 2 + random.uniform(-10, 10),
        CANVAS_SIZE / 2 + random.uniform(-10, 10),
    )

    return {
        "profile": profile,
        "center": center,
        "base_angle": base_angle,
        "cross_angle": base_angle + angle_between,
        "first_length": random.uniform(*length_range),
        "second_length": random.uniform(*length_range),
        "first_ratio": random.uniform(*ratio_range),
        "second_ratio": random.uniform(*ratio_range),
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
            "curve_offsets": [random.uniform(-profile.curve * 0.25, profile.curve * 0.25)],
        },
        {
            "points": list(second),
            "width": max(1, width + random.randint(-1, 1)),
            "curve_offsets": [random.uniform(-profile.curve * 0.25, profile.curve * 0.25)],
        },
    ]

    return render_paths(paths, profile=profile)


def make_plus_sample():
    return make_plus()


def make_plus_npy(save_path="data_polygon/plus.npy", count=100000, seed=None):
    return save_samples(save_path, make_plus_sample, count, seed=seed)


if __name__ == "__main__":
    make_plus_npy("data_polygon/plus.npy", count=100000)
