import math
from typing import Dict, List, Tuple
from sqlalchemy.orm import Session
from ..models import UserRating, Anime


def _build_rating_matrix(db: Session) -> Dict[int, Dict[int, float]]:
    ratings = db.query(UserRating).all()
    matrix: Dict[int, Dict[int, float]] = {}
    for r in ratings:
        if r.user_id not in matrix:
            matrix[r.user_id] = {}
        matrix[r.user_id][r.anime_id] = float(r.score)
    return matrix


def _mean_center(vec: Dict[int, float]) -> Dict[int, float]:
    """Subtract each user's mean rating so similarity reflects taste, not scale."""
    if not vec:
        return {}
    mean = sum(vec.values()) / len(vec)
    return {k: v - mean for k, v in vec.items()}


def _pearson_similarity(
    vec_a: Dict[int, float],
    vec_b: Dict[int, float],
) -> float:
    """
    Pearson correlation over the COMMON rated items (mean-centered cosine).
    This finds users with SIMILAR taste patterns, not just similar score scales.
    Minimum 2 common items required for a meaningful signal.
    """
    common_ids = set(vec_a.keys()) & set(vec_b.keys())
    if len(common_ids) < 2:
        return 0.0

    centered_a = _mean_center(vec_a)
    centered_b = _mean_center(vec_b)

    dot = sum(centered_a[i] * centered_b[i] for i in common_ids)
    mag_a = math.sqrt(sum(centered_a[i] ** 2 for i in common_ids))
    mag_b = math.sqrt(sum(centered_b[i] ** 2 for i in common_ids))

    if mag_a == 0.0 or mag_b == 0.0:
        return 0.0

    return max(-1.0, min(1.0, dot / (mag_a * mag_b)))


def _get_top_neighbors(
    target_user_id: int,
    matrix: Dict[int, Dict[int, float]],
    k: int = 30,
    min_similarity: float = 0.1,
) -> List[Tuple[int, float]]:
    if target_user_id not in matrix:
        return []

    target_vec = matrix[target_user_id]
    similarities: List[Tuple[int, float]] = []

    for user_id, user_vec in matrix.items():
        if user_id == target_user_id:
            continue
        sim = _pearson_similarity(target_vec, user_vec)
        if sim >= min_similarity:
            similarities.append((user_id, sim))

    similarities.sort(key=lambda x: x[1], reverse=True)
    return similarities[:k]


def _predict_scores(
    target_user_id: int,
    neighbors: List[Tuple[int, float]],
    matrix: Dict[int, Dict[int, float]],
) -> Dict[int, Tuple[float, int]]:
    if target_user_id not in matrix:
        return {}

    target_vec = matrix[target_user_id]
    target_mean = sum(target_vec.values()) / len(target_vec) if target_vec else 7.0

    already_rated = set(target_vec.keys())
    anime_data: Dict[int, List] = {}  # anime_id -> [weighted_sum, weight_sum, neighbor_count]

    for neighbor_id, similarity in neighbors:
        neighbor_vec = matrix.get(neighbor_id, {})
        if not neighbor_vec:
            continue
        neighbor_mean = sum(neighbor_vec.values()) / len(neighbor_vec)

        for anime_id, rating in neighbor_vec.items():
            if anime_id in already_rated:
                continue
            if anime_id not in anime_data:
                anime_data[anime_id] = [0.0, 0.0, 0]

            # Predict: target_mean + weighted deviation from neighbor's mean
            deviation = rating - neighbor_mean
            anime_data[anime_id][0] += similarity * deviation
            anime_data[anime_id][1] += abs(similarity)
            anime_data[anime_id][2] += 1

    predictions: Dict[int, Tuple[float, int]] = {}
    for anime_id, (weighted_dev_sum, weight_sum, count) in anime_data.items():
        if weight_sum > 0:
            predicted = target_mean + (weighted_dev_sum / weight_sum)
            # Clamp to [1, 10]
            predicted = max(1.0, min(10.0, predicted))
            predictions[anime_id] = (predicted, count)

    return predictions


def get_recommendations(
    user_id: int,
    db: Session,
    top_n: int = 10,
    min_neighbor_count: int = 1,
) -> List[dict]:
    matrix = _build_rating_matrix(db)

    # Need at least 5 ratings from the current user to attempt CF
    if user_id not in matrix or len(matrix[user_id]) < 5:
        recs = _cold_start_recommendations(db, user_id, top_n)
        return recs

    neighbors = _get_top_neighbors(user_id, matrix, k=30)

    if not neighbors:
        return _cold_start_recommendations(db, user_id, top_n)

    predictions = _predict_scores(user_id, neighbors, matrix)

    filtered = [
        (anime_id, score, count)
        for anime_id, (score, count) in predictions.items()
        if count >= min_neighbor_count
    ]
    filtered.sort(key=lambda x: x[1], reverse=True)
    top_predictions = filtered[:top_n]

    if not top_predictions:
        return _cold_start_recommendations(db, user_id, top_n)

    anime_ids = [item[0] for item in top_predictions]
    animes = {
        a.id: a
        for a in db.query(Anime).filter(Anime.id.in_(anime_ids)).all()
    }

    recommendations = []
    for anime_id, predicted_score, neighbor_count in top_predictions:
        anime = animes.get(anime_id)
        if not anime:
            continue

        reason = _build_reason(predicted_score, neighbor_count, anime)
        recommendations.append({
            "anime": anime,
            "predicted_score": round(predicted_score, 2),
            "reason": reason,
            "similar_users_count": neighbor_count,
            "algorithm": "cf",
        })

    return recommendations


def _cold_start_recommendations(
    db: Session,
    user_id: int,
    top_n: int,
) -> List[dict]:
    from ..models import UserRating as UR

    rated_anime_ids = {
        r.anime_id
        for r in db.query(UR.anime_id).filter(UR.user_id == user_id).all()
    }

    animes = (
        db.query(Anime)
        .filter(Anime.average_rating.isnot(None))
        .filter(~Anime.id.in_(rated_anime_ids) if rated_anime_ids else True)
        .order_by(Anime.average_rating.desc())
        .limit(top_n)
        .all()
    )

    return [
        {
            "anime": anime,
            "predicted_score": round(anime.average_rating or 7.0, 2),
            "reason": f"Highly rated by the community ({anime.average_rating:.1f}/10). Rate more anime to get personalized recommendations.",
            "similar_users_count": 0,
            "algorithm": "cold_start",
        }
        for anime in animes
    ]


def _build_reason(predicted_score: float, neighbor_count: int, anime: Anime) -> str:
    genres_str = ""
    if anime.genres:
        genres_str = f" ({', '.join(anime.genres[:2])})"

    neighbor_text = "1 user with similar taste" if neighbor_count == 1 else f"{neighbor_count} users with similar taste"

    if predicted_score >= 8.5:
        quality = "loved"
    elif predicted_score >= 7.0:
        quality = "highly rated"
    else:
        quality = "enjoyed"

    return f"{neighbor_text} {quality} this anime{genres_str} with predicted score of {predicted_score:.1f}/10"
