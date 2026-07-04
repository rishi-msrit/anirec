"""
test_collaborative.py
=====================
Unit tests for the collaborative filtering algorithm.
Standalone — no database or psycopg2 required.
Verifies cosine similarity in [0,1] and recommendation logic.

Usage:
    cd backend
    python -m pytest tests/test_collaborative.py -v
"""

import math
import pytest
from typing import Dict, List, Tuple


# Standalone helper functions


def _cosine_similarity(
    vec_a: Dict[int, float],
    vec_b: Dict[int, float]
) -> float:
    common_ids = set(vec_a.keys()) & set(vec_b.keys())
    if not common_ids:
        return 0.0
    dot_product = sum(vec_a[aid] * vec_b[aid] for aid in common_ids)
    magnitude_a = math.sqrt(sum(v ** 2 for v in vec_a.values()))
    magnitude_b = math.sqrt(sum(v ** 2 for v in vec_b.values()))
    if magnitude_a == 0.0 or magnitude_b == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot_product / (magnitude_a * magnitude_b)))


def _get_top_neighbors(
    target_user_id: int,
    matrix: Dict[int, Dict[int, float]],
    k: int = 20
) -> List[Tuple[int, float]]:
    if target_user_id not in matrix:
        return []
    target_vec = matrix[target_user_id]
    similarities = []
    for user_id, user_vec in matrix.items():
        if user_id == target_user_id:
            continue
        sim = _cosine_similarity(target_vec, user_vec)
        if sim > 0.0:
            similarities.append((user_id, sim))
    similarities.sort(key=lambda x: x[1], reverse=True)
    return similarities[:k]


def _predict_scores(
    target_user_id: int,
    neighbors: List[Tuple[int, float]],
    matrix: Dict[int, Dict[int, float]]
) -> Dict[int, Tuple[float, int]]:
    if target_user_id not in matrix:
        return {}
    already_rated = set(matrix[target_user_id].keys())
    anime_scores: Dict[int, List[float]] = {}
    anime_neighbor_count: Dict[int, int] = {}
    for neighbor_id, similarity in neighbors:
        for anime_id, rating in matrix.get(neighbor_id, {}).items():
            if anime_id in already_rated:
                continue
            if anime_id not in anime_scores:
                anime_scores[anime_id] = [0.0, 0.0]
                anime_neighbor_count[anime_id] = 0
            anime_scores[anime_id][0] += similarity * rating
            anime_scores[anime_id][1] += similarity
            anime_neighbor_count[anime_id] += 1
    predictions = {}
    for anime_id, (weighted_sum, weight_sum) in anime_scores.items():
        if weight_sum > 0:
            predictions[anime_id] = (weighted_sum / weight_sum, anime_neighbor_count[anime_id])
    return predictions



class TestCosineSimilarity:
    """Test that cosine similarity is correct and bounded."""

    def test_identical_vectors_return_one(self):
        vec = {1: 8.0, 2: 7.0, 3: 9.0}
        sim = _cosine_similarity(vec, vec)
        assert abs(sim - 1.0) < 1e-9, f"Expected 1.0, got {sim}"

    def test_no_overlap_returns_zero(self):
        vec_a = {1: 8.0, 2: 7.0}
        vec_b = {3: 9.0, 4: 6.0}
        sim = _cosine_similarity(vec_a, vec_b)
        assert sim == 0.0

    def test_similarity_is_bounded(self):
        """Similarity must always be in [0, 1]."""
        test_cases = [
            ({1: 10.0}, {1: 1.0}),
            ({1: 5.0, 2: 3.0, 3: 8.0}, {1: 7.0, 2: 2.0, 3: 9.0}),
            ({1: 1.0, 2: 1.0}, {1: 10.0, 2: 10.0}),
        ]
        for vec_a, vec_b in test_cases:
            sim = _cosine_similarity(vec_a, vec_b)
            assert 0.0 <= sim <= 1.0, f"Out of bounds: {sim} for {vec_a}, {vec_b}"

    def test_partial_overlap(self):
        """Similarity with partial overlap should be between 0 and 1."""
        vec_a = {1: 8.0, 2: 6.0, 3: 9.0}
        vec_b = {1: 7.0, 4: 5.0, 5: 8.0}  # Only anime 1 is shared
        sim = _cosine_similarity(vec_a, vec_b)
        assert 0.0 < sim < 1.0

    def test_empty_vector_returns_zero(self):
        sim = _cosine_similarity({}, {1: 5.0})
        assert sim == 0.0

    def test_known_cosine_similarity(self):
        """
        Manual calculation:
        vec_a = {1: 3, 2: 4}  ||vec_a|| = 5
        vec_b = {1: 4, 2: 3}  ||vec_b|| = 5
        dot = 3*4 + 4*3 = 24
        cosine = 24 / (5 * 5) = 24/25 = 0.96
        """
        vec_a = {1: 3.0, 2: 4.0}
        vec_b = {1: 4.0, 2: 3.0}
        sim = _cosine_similarity(vec_a, vec_b)
        assert abs(sim - 0.96) < 1e-9


class TestTopNeighbors:
    """Test neighbor finding."""

    def test_excludes_target_user(self):
        matrix = {
            1: {1: 8.0, 2: 7.0},
            2: {1: 8.0, 2: 6.0},
            3: {1: 5.0, 2: 9.0},
        }
        neighbors = _get_top_neighbors(1, matrix, k=10)
        neighbor_ids = [uid for uid, _ in neighbors]
        assert 1 not in neighbor_ids

    def test_returns_k_at_most(self):
        matrix = {
            i: {j: float(j % 10 + 1) for j in range(1, 20)}
            for i in range(1, 30)
        }
        neighbors = _get_top_neighbors(1, matrix, k=5)
        assert len(neighbors) <= 5

    def test_sorted_by_similarity_descending(self):
        matrix = {
            1: {1: 8.0, 2: 7.0, 3: 9.0},
            2: {1: 8.0, 2: 7.0, 3: 9.0},  # Identical to user 1
            3: {1: 1.0},  # Very different
        }
        neighbors = _get_top_neighbors(1, matrix, k=10)
        similarities = [sim for _, sim in neighbors]
        assert similarities == sorted(similarities, reverse=True)

    def test_returns_empty_for_unknown_user(self):
        matrix = {1: {1: 8.0}, 2: {2: 7.0}}
        neighbors = _get_top_neighbors(999, matrix, k=10)
        assert neighbors == []


class TestPredictScores:
    """Test score prediction for unseen anime."""

    def test_does_not_recommend_already_rated(self):
        matrix = {
            1: {1: 8.0, 2: 7.0},        # Target user rated anime 1 and 2
            2: {1: 9.0, 2: 8.0, 3: 7.0}, # Neighbor also rated anime 3
        }
        neighbors = [(2, 0.99)]
        predictions = _predict_scores(1, neighbors, matrix)
        assert 1 not in predictions  # Already rated
        assert 2 not in predictions  # Already rated
        assert 3 in predictions      # New — should be recommended

    def test_prediction_within_score_range(self):
        matrix = {
            1: {1: 8.0},
            2: {1: 7.0, 2: 9.0},
            3: {1: 6.0, 2: 8.0},
        }
        neighbors = [(2, 0.9), (3, 0.8)]
        predictions = _predict_scores(1, neighbors, matrix)
        for anime_id, (score, _) in predictions.items():
            assert 1.0 <= score <= 10.0, f"Score {score} out of range for anime {anime_id}"

    def test_weighted_average_correctness(self):
        """
        Manual: anime 2 score = (0.9 * 9 + 0.8 * 8) / (0.9 + 0.8)
                               = (8.1 + 6.4) / 1.7
                               = 14.5 / 1.7 ≈ 8.529
        """
        matrix = {
            1: {1: 8.0},          # Target user: only rated anime 1
            2: {1: 7.0, 2: 9.0},  # Neighbor 2
            3: {1: 6.0, 2: 8.0},  # Neighbor 3
        }
        neighbors = [(2, 0.9), (3, 0.8)]
        predictions = _predict_scores(1, neighbors, matrix)
        assert 2 in predictions
        expected_score = (0.9 * 9 + 0.8 * 8) / (0.9 + 0.8)
        actual_score, _ = predictions[2]
        assert abs(actual_score - expected_score) < 1e-9


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
