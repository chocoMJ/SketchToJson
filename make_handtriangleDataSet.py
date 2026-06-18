import math
import random

from sketch_variation import CANVAS_SIZE, choose_profile, render_paths, save_samples


HARD_TRIANGLE_RATIO = 0.30


def _triangle_metrics(points):
    vertices = points[:-1] if points and points[0] == points[-1] else points
    if len(vertices) != 3:
        return None

    lengths = []
    for index, point in enumerate(vertices):
        next_point = vertices[(index + 1) % 3]
        lengths.append(math.hypot(next_point[0] - point[0], next_point[1] - point[1]))

    area = abs(
        vertices[0][0] * (vertices[1][1] - vertices[2][1])
        + vertices[1][0] * (vertices[2][1] - vertices[0][1])
        + vertices[2][0] * (vertices[0][1] - vertices[1][1])
    ) / 2

    angles = []
    for index, point in enumerate(vertices):
        prev_point = vertices[index - 1]
        next_point = vertices[(index + 1) % 3]
        first = (prev_point[0] - point[0], prev_point[1] - point[1])
        second = (next_point[0] - point[0], next_point[1] - point[1])
        first_len = math.hypot(*first)
        second_len = math.hypot(*second)
        if first_len == 0 or second_len == 0:
            return None
        cosine = (first[0] * second[0] + first[1] * second[1]) / (first_len * second_len)
        angles.append(math.degrees(math.acos(max(-1, min(1, cosine)))))

    return {"area": area, "lengths": lengths, "angles": angles}


def _valid_triangle_points(points):
    metrics = _triangle_metrics(points)
    if metrics is None:
        return False

    if metrics["area"] < 360:
        return False

    if min(metrics["lengths"]) < 34:
        return False

    if min(metrics["angles"]) < 24 or max(metrics["angles"]) > 132:
        return False

    return True


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


def _sample_hard_triangle_points(profile):
    center = (
        CANVAS_SIZE / 2 + random.uniform(-10, 10),
        CANVAS_SIZE / 2 + random.uniform(-10, 10),
    )

    if profile.name == "boundary":
        radius_range = (30, 54)
        angle_jitter = math.radians(12)
    elif profile.name == "strong":
        radius_range = (32, 52)
        angle_jitter = math.radians(9)
    else:
        radius_range = (34, 50)
        angle_jitter = math.radians(7)

    modes = (
        (math.radians(38), math.radians(154)),
        (math.radians(54), math.radians(132)),
        (math.radians(72), math.radians(118)),
    )

    for _ in range(24):
        first_gap, second_gap = random.choice(modes)
        first_gap += random.uniform(-angle_jitter, angle_jitter)
        second_gap += random.uniform(-angle_jitter, angle_jitter)
        if first_gap + second_gap >= math.tau - math.radians(34):
            continue

        rotation = random.uniform(0, math.tau)
        angles = [rotation, rotation + first_gap, rotation + first_gap + second_gap]
        radii = [random.uniform(*radius_range) for _ in range(3)]
        if random.random() < 0.55:
            radii[random.randrange(3)] *= random.uniform(0.72, 0.86)

        points = [
            (center[0] + math.cos(angle) * radius, center[1] + math.sin(angle) * radius)
            for angle, radius in zip(angles, radii)
        ]
        points.append(points[0])
        if _valid_triangle_points(points):
            return points

    return _sample_triangle_points(profile)


def make_handtriangle():
    profile = choose_profile()
    if random.random() < HARD_TRIANGLE_RATIO:
        points = _sample_hard_triangle_points(profile)
        curve_scale = 0.22
    else:
        points = _sample_triangle_points(profile)
        curve_scale = 0.18
    width = random.randint(*profile.width_range)
    curves = [random.uniform(-profile.curve * curve_scale, profile.curve * curve_scale) for _ in range(len(points) - 1)]

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
