import math
from typing import Dict, List, Tuple, Optional
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

    similarity = dot_product / (magnitude_a * magnitude_b)
    return max(0.0, min(1.0, similarity))


def _get_top_neighbors(
    target_user_id: int,
    matrix: Dict[int, Dict[int, float]],
    k: int = 20
) -> List[Tuple[int, float]]:
    if target_user_id not in matrix:
        return []

    target_vec = matrix[target_user_id]
    similarities: List[Tuple[int, float]] = []

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
        neighbor_ratings = matrix.get(neighbor_id, {})
        for anime_id, rating in neighbor_ratings.items():
            if anime_id in already_rated:
                continue

            if anime_id not in anime_scores:
                anime_scores[anime_id] = [0.0, 0.0]
                anime_neighbor_count[anime_id] = 0

            anime_scores[anime_id][0] += similarity * rating
            anime_scores[anime_id][1] += similarity
            anime_neighbor_count[anime_id] += 1

    predictions: Dict[int, Tuple[float, int]] = {}
    for anime_id, (weighted_sum, weight_sum) in anime_scores.items():
        if weight_sum > 0:
            predicted = weighted_sum / weight_sum
            predictions[anime_id] = (predicted, anime_neighbor_count[anime_id])

    return predictions


def get_recommendations(
    user_id: int,
    db: Session,
    top_n: int = 10,
    min_neighbor_count: int = 1,
) -> List[dict]:
    matrix = _build_rating_matrix(db)

    if user_id not in matrix or len(matrix[user_id]) < 1:
        return _cold_start_recommendations(db, user_id, top_n)

    neighbors = _get_top_neighbors(user_id, matrix, k=20)

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
        })

    return recommendations


def _cold_start_recommendations(
    db: Session,
    user_id: int,
    top_n: int
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
        }
        for anime in animes
    ]


def _build_reason(predicted_score: float, neighbor_count: int, anime: Anime) -> str:
    genres_str = ""
    if anime.genres:
        genres_str = f" ({', '.join(anime.genres[:2])})"

    if neighbor_count == 1:
        neighbor_text = "1 user with similar taste"
    else:
        neighbor_text = f"{neighbor_count} users with similar taste"

    if predicted_score >= 8.5:
        quality = "loved"
    elif predicted_score >= 7.0:
        quality = "highly rated"
    else:
        quality = "enjoyed"

    return f"{neighbor_text} {quality} this anime{genres_str} with predicted score of {predicted_score:.1f}/10"

