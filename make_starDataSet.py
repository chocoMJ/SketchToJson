import math
import random

from sketch_variation import CANVAS_SIZE, choose_profile, render_paths, save_samples


def _sample_star_params(profile=None):
    profile = profile or choose_profile()
    mode = "one_stroke" if random.random() < 0.5 else "outline"

    if profile.name == "boundary":
        outer_radius = random.uniform(34, 47)
        inner_radius = random.uniform(12, 29)
        angle_jitter = math.radians(12)
        radius_jitter = 0.22
    elif profile.name == "strong":
        outer_radius = random.uniform(36, 46)
        inner_radius = random.uniform(14, 27)
        angle_jitter = math.radians(9)
        radius_jitter = 0.16
    else:
        outer_radius = random.uniform(38, 45)
        inner_radius = random.uniform(16, 25)
        angle_jitter = math.radians(5)
        radius_jitter = 0.10

    return {
        "profile": profile,
        "mode": mode,
        "center": (
            CANVAS_SIZE / 2 + random.uniform(-5, 5),
            CANVAS_SIZE / 2 + random.uniform(-5, 5),
        ),
        "rotation": random.uniform(0, math.tau),
        "outer_radius": outer_radius,
        "inner_radius": inner_radius,
        "angle_jitter": angle_jitter,
        "radius_jitter": radius_jitter,
    }


def _radial_point(center, angle, radius):
    return center[0] + math.cos(angle) * radius, center[1] + math.sin(angle) * radius


def _outer_points(params):
    points = []
    for index in range(5):
        angle = params["rotation"] - math.pi / 2 + index * math.tau / 5
        angle += random.uniform(-params["angle_jitter"], params["angle_jitter"])
        radius = params["outer_radius"] * random.uniform(1 - params["radius_jitter"], 1 + params["radius_jitter"])
        points.append(_radial_point(params["center"], angle, radius))
    return points


def _outline_points(params, outer):
    points = []
    for index in range(5):
        outer_angle = params["rotation"] - math.pi / 2 + index * math.tau / 5
        inner_angle = outer_angle + math.pi / 5
        inner_angle += random.uniform(-params["angle_jitter"] * 0.6, params["angle_jitter"] * 0.6)
        inner_radius = params["inner_radius"] * random.uniform(0.85, 1.15)
        points.append(outer[index])
        points.append(_radial_point(params["center"], inner_angle, inner_radius))
    points.append(points[0])
    return points


def _one_stroke_points(outer):
    if random.random() < 0.5:
        order = [0, 2, 4, 1, 3, 0]
    else:
        order = [0, 3, 1, 4, 2, 0]
    return [outer[index] for index in order]


def make_star():
    params = _sample_star_params()
    profile = params["profile"]
    outer = _outer_points(params)

    if params["mode"] == "one_stroke":
        points = _one_stroke_points(outer)
        curve_scale = 0.30
    else:
        points = _outline_points(params, outer)
        curve_scale = 0.18

    width = random.randint(*profile.width_range)
    curves = [random.uniform(-profile.curve * curve_scale, profile.curve * curve_scale) for _ in range(len(points) - 1)]

    return render_paths(
        [{"points": points, "width": width, "curve_offsets": curves}],
        profile=profile,
    )


def make_star_sample():
    return make_star()


def make_star_npy(save_path="data_polygon/handstar.npy", count=100000, seed=None):
    return save_samples(save_path, make_star_sample, count, seed=seed)


if __name__ == "__main__":
    make_star_npy("data_polygon/handstar.npy", count=100000)
