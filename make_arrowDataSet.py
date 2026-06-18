import math
import random

from sketch_variation import (
    CANVAS_SIZE,
    choose_profile,
    point_from,
    render_paths,
    save_samples,
    unit,
)


DIRECTION_ANGLES = {
    "right": 0.0,
    "down": math.pi / 2,
    "left": math.pi,
    "up": -math.pi / 2,
}


def direction_vectors(direction):
    if direction not in DIRECTION_ANGLES:
        raise ValueError(f"unknown arrow direction: {direction}")

    angle = DIRECTION_ANGLES[direction]
    dx, dy = unit(angle)
    nx, ny = unit(angle + math.pi / 2)
    return (dx, dy), (nx, ny)


def _sample_arrow_params(direction=None, profile=None):
    profile = profile or choose_profile()

    if direction is None or direction == "free":
        angle = random.uniform(0, math.tau)
    elif direction in DIRECTION_ANGLES:
        angle = DIRECTION_ANGLES[direction] + random.uniform(-math.pi / 4, math.pi / 4)
    else:
        raise ValueError(f"unknown arrow direction: {direction}")

    center = (
        CANVAS_SIZE / 2 + random.uniform(-9, 9),
        CANVAS_SIZE / 2 + random.uniform(-9, 9),
    )

    if profile.name == "boundary":
        body_length = random.uniform(46, 102)
        head_angle_left = math.radians(random.uniform(16, 82))
        head_angle_right = math.radians(random.uniform(16, 82))
        head_left = random.uniform(14, 42)
        head_right = random.uniform(14, 42)
    elif profile.name == "strong":
        body_length = random.uniform(54, 96)
        head_angle_left = math.radians(random.uniform(20, 74))
        head_angle_right = math.radians(random.uniform(20, 74))
        head_left = random.uniform(18, 39)
        head_right = random.uniform(18, 39)
    else:
        body_length = random.uniform(62, 92)
        head_angle_left = math.radians(random.uniform(26, 66))
        head_angle_right = math.radians(random.uniform(26, 66))
        head_left = random.uniform(22, 37)
        head_right = random.uniform(22, 37)

    curve = random.uniform(-profile.curve, profile.curve)

    return {
        "profile": profile,
        "angle": angle % math.tau,
        "center": center,
        "body_length": body_length,
        "head_angle_left": head_angle_left,
        "head_angle_right": head_angle_right,
        "head_left": head_left,
        "head_right": head_right,
        "curve": curve,
    }


def make_arrow(direction="right"):
    params = _sample_arrow_params(direction)
    profile = params["profile"]
    angle = params["angle"]
    half = params["body_length"] / 2
    tail = point_from(params["center"], angle + math.pi, half)
    tip = point_from(params["center"], angle, half)
    width = random.randint(*profile.width_range)

    left_end = point_from(tip, angle + math.pi - params["head_angle_left"], params["head_left"])
    right_end = point_from(tip, angle + math.pi + params["head_angle_right"], params["head_right"])

    paths = [
        {"points": [tail, tip], "width": width, "curve_offsets": [params["curve"]]},
        {
            "points": [tip, left_end],
            "width": width,
            "curve_offsets": [random.uniform(-profile.curve * 0.25, profile.curve * 0.25)],
        },
        {
            "points": [tip, right_end],
            "width": width,
            "curve_offsets": [random.uniform(-profile.curve * 0.25, profile.curve * 0.25)],
        },
    ]

    return render_paths(paths, profile=profile)


def make_arrow_sample():
    return make_arrow("free")


def make_arrow_npy(save_path="data_polygon/arrow.npy", count_per_direction=100000, seed=None):
    directions = []
    for direction in ["right", "left", "up", "down"]:
        directions.extend([direction] * count_per_direction)

    def maker():
        return make_arrow(directions.pop())

    return save_samples(save_path, maker, len(directions), seed=seed)


if __name__ == "__main__":
    make_arrow_npy("data_polygon/arrow.npy", count_per_direction=100000)
