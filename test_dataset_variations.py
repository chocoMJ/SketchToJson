import math
import os
import random
import tempfile
import unittest

import numpy as np

import make_HashDataSet
import make_arrowDataSet
import make_handtriangleDataSet
import make_plusDataSet
import make_starDataSet
import make_structure
from sketch_variation import build_sample_array, choose_profile, validate_sample


class DatasetVariationTests(unittest.TestCase):
    def setUp(self):
        random.seed(1234)
        np.random.seed(1234)

    def test_sample_contracts(self):
        makers = [
            make_handtriangleDataSet.make_handtriangle_sample,
            make_structure.make_structure_sample,
            make_plusDataSet.make_plus_sample,
            make_HashDataSet.make_hash_sample,
            make_arrowDataSet.make_arrow_sample,
            make_starDataSet.make_star_sample,
        ]

        for maker in makers:
            with self.subTest(maker=maker.__module__):
                arr = maker()
                self.assertEqual((28, 28), arr.shape)
                self.assertEqual(np.uint8, arr.dtype)
                self.assertTrue(validate_sample(arr, min_pixels=8, max_edge_fraction=0.75))

    def test_npy_generation_is_seed_reproducible(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            first = os.path.join(temp_dir, "plus-first.npy")
            second = os.path.join(temp_dir, "plus-second.npy")

            make_plusDataSet.make_plus_npy(first, count=8, seed=99)
            make_plusDataSet.make_plus_npy(second, count=8, seed=99)

            first_arr = np.load(first)
            second_arr = np.load(second)
            self.assertEqual((8, 784), first_arr.shape)
            self.assertEqual(np.uint8, first_arr.dtype)
            np.testing.assert_array_equal(first_arr, second_arr)

    def test_arrow_npy_keeps_direction_scaled_count(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = os.path.join(temp_dir, "arrow.npy")
            make_arrowDataSet.make_arrow_npy(path, count_per_direction=3, seed=7)
            arr = np.load(path)
            self.assertEqual((12, 784), arr.shape)
            self.assertEqual(np.uint8, arr.dtype)

    def test_samples_are_shuffled_before_save_shape(self):
        values = iter(range(8))

        def maker():
            return np.full((28, 28), next(values), dtype=np.uint8)

        np.random.seed(5)
        samples = build_sample_array(maker, 8, shuffle=True)
        observed = samples[:, 0].tolist()
        self.assertCountEqual(list(range(8)), observed)
        self.assertNotEqual(list(range(8)), observed)

    def test_profile_distribution_has_boundary_samples(self):
        random.seed(11)
        names = [choose_profile().name for _ in range(4000)]
        boundary_ratio = names.count("boundary") / len(names)

        self.assertGreater(boundary_ratio, 0.025)
        self.assertLess(boundary_ratio, 0.085)
        self.assertIn("light", names)
        self.assertIn("medium", names)
        self.assertIn("strong", names)

    def test_hash_geometry_keeps_two_parallel_line_pairs(self):
        random.seed(41)

        for profile_name, rules in make_HashDataSet.HASH_RULES.items():
            profile = choose_profile(profile_name)
            for _ in range(200):
                geometry, paths = make_HashDataSet._build_hash_paths(profile)
                self.assertEqual(4, len(paths))
                self.assertEqual(2, len(geometry["pairs"]))
                self.assertGreaterEqual(geometry["gap"], geometry["width"] * 2.8)

                pair_angles = [pair["angle"] for pair in geometry["pairs"]]
                angle_between = math.degrees(make_HashDataSet._angle_delta(pair_angles[0], pair_angles[1]))
                self.assertGreaterEqual(angle_between, rules["angle_between"][0])
                self.assertLessEqual(angle_between, rules["angle_between"][1])

                for pair in geometry["pairs"]:
                    lines = pair["lines"]
                    self.assertEqual(2, len(lines))
                    parallel_delta = math.degrees(
                        make_HashDataSet._angle_delta(lines[0]["angle"], lines[1]["angle"])
                    )
                    self.assertLessEqual(parallel_delta, rules["parallel_jitter"] + 1e-9)

                    gap_x = lines[0]["center"][0] - lines[1]["center"][0]
                    gap_y = lines[0]["center"][1] - lines[1]["center"][1]
                    projected_gap = abs(gap_x * pair["normal"][0] + gap_y * pair["normal"][1])
                    self.assertAlmostEqual(geometry["gap"], projected_gap, delta=1e-6)

                    for line in lines:
                        distance_from_center = math.hypot(
                            line["center"][0] - geometry["center"][0],
                            line["center"][1] - geometry["center"][1],
                        )
                        self.assertGreaterEqual(distance_from_center, geometry["width"] * 1.35)

    def test_structure_sampler_distribution_and_vertices(self):
        random.seed(51)
        specs = [make_structure._choose_structure_spec() for _ in range(5000)]

        new_ratio = sum(spec["family"] == "new" for spec in specs) / len(specs)
        closed_ratio = sum(spec["closure"] == "closed" for spec in specs) / len(specs)

        self.assertGreater(new_ratio, 0.70)
        self.assertLess(new_ratio, 0.80)
        self.assertGreater(closed_ratio, 0.46)
        self.assertLess(closed_ratio, 0.54)

        categories = {spec["category"] for spec in specs}
        self.assertIn("closed_random_polygon", categories)
        self.assertIn("open_random_polyline", categories)
        self.assertIn("irregular_open_outline", categories)
        self.assertIn("irregular_closed_room", categories)

        for spec in specs:
            if spec["closure"] == "closed":
                self.assertGreaterEqual(spec["vertex_count"], 4)
            else:
                self.assertGreaterEqual(spec["vertex_count"], 3)

    def test_structure_npy_generation_is_seed_reproducible(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            first = os.path.join(temp_dir, "structure-first.npy")
            second = os.path.join(temp_dir, "structure-second.npy")

            make_structure.make_structure_npy(first, count=10, seed=123)
            make_structure.make_structure_npy(second, count=10, seed=123)

            first_arr = np.load(first)
            second_arr = np.load(second)
            self.assertEqual((10, 784), first_arr.shape)
            self.assertEqual(np.uint8, first_arr.dtype)
            np.testing.assert_array_equal(first_arr, second_arr)

    def test_arrow_free_rotation_covers_all_quadrants(self):
        random.seed(21)
        quadrants = set()

        for _ in range(240):
            angle = make_arrowDataSet._sample_arrow_params(direction="free")["angle"]
            quadrants.add(int((angle % math.tau) / (math.pi / 2)))

        self.assertEqual({0, 1, 2, 3}, quadrants)

    def test_star_sampler_emits_both_forms(self):
        random.seed(31)
        modes = {make_starDataSet._sample_star_params()["mode"] for _ in range(200)}
        self.assertEqual({"one_stroke", "outline"}, modes)


if __name__ == "__main__":
    unittest.main()
