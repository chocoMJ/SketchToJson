import math
import random

from sketch_variation import CANVAS_SIZE, choose_profile, render_paths, save_samples


def _sample_triangle_points(profile):
    center = (
        CANVAS_SIZE / 2 + random.uniform(-6, 6),
        CANVAS_SIZE / 2 + random.uniform(-6, 6),
    )
    rotation = random.uniform(0, math.tau)

    if profile.name == "boundary":
        radii = [random.uniform(34, 50), random.uniform(32, 50), random.uniform(32, 50)]
        angle_jitter = math.radians(16)
    elif profile.name == "strong":
        radii = [random.uniform(36, 48), random.uniform(34, 48), random.uniform(34, 48)]
        angle_jitter = math.radians(11)
    else:
        radii = [random.uniform(38, 46), random.uniform(36, 46), random.uniform(36, 46)]
        angle_jitter = math.radians(6)

    points = []
    for index, radius in enumerate(radii):
        angle = rotation - math.pi / 2 + index * math.tau / 3 + random.uniform(-angle_jitter, angle_jitter)
        points.append((center[0] + math.cos(angle) * radius, center[1] + math.sin(angle) * radius))

    points.append(points[0])
    return points


def make_handtriangle():
    profile = choose_profile()
    points = _sample_triangle_points(profile)
    width = random.randint(*profile.width_range)
    curves = [random.uniform(-profile.curve * 0.18, profile.curve * 0.18) for _ in range(len(points) - 1)]

    return render_paths(
        [{"points": points, "width": width, "curve_offsets": curves}],
        profile=profile,
        flip_x=random.random() < 0.5,
        flip_y=random.random() < 0.5,
    )


def make_handtriangle_sample():
    return make_handtriangle()


def make_handtriangle_npy(save_path="data_polygon/handtriangle.npy", count=100000, seed=None):
    return save_samples(save_path, make_handtriangle_sample, count, seed=seed)


if __name__ == "__main__":
    make_handtriangle_npy("data_polygon/handtriangle.npy", count=100000)
