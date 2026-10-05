from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, UserRating
from ..schemas import RecommendationResponse
from ..algorithms.collaborative import get_recommendations, _build_rating_matrix, _get_top_neighbors
from ..auth import get_current_user

router = APIRouter(prefix="/user", tags=["Recommendations"])


@router.get("/recommend", response_model=RecommendationResponse)
def get_recommendations_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recommendations = get_recommendations(user_id=current_user.id, db=db, top_n=10)

    # Determine which algorithm was actually used from results
    if recommendations and recommendations[0].get("algorithm") == "cf":
        algorithm = "Collaborative Filtering"
    else:
        algorithm = "cold_start"

    return RecommendationResponse(
        user_id=current_user.id,
        recommendations=recommendations,
        algorithm=algorithm,
    )


@router.get("/recommend/debug")
def debug_cf(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Debug endpoint — shows CF internals so we can diagnose issues."""
    matrix = _build_rating_matrix(db)

    user_rating_count = len(matrix.get(current_user.id, {}))
    total_users_in_matrix = len(matrix)
    total_ratings_in_matrix = sum(len(v) for v in matrix.values())

    neighbors = _get_top_neighbors(current_user.id, matrix, k=30) if user_rating_count >= 5 else []

    # Raw DB count for this user
    db_rating_count = db.query(UserRating).filter(UserRating.user_id == current_user.id).count()

    return {
        "user_id": current_user.id,
        "your_ratings_in_db": db_rating_count,
        "your_ratings_in_matrix": user_rating_count,
        "total_users_in_matrix": total_users_in_matrix,
        "total_ratings_in_matrix": total_ratings_in_matrix,
        "cf_threshold_met": user_rating_count >= 5,
        "neighbors_found": len(neighbors),
        "top_5_neighbors": [
            {"user_id": uid, "similarity": round(sim, 4)}
            for uid, sim in neighbors[:5]
        ],
        "diagnosis": (
            "No other users in DB — seed_users.py was never run on production"
            if total_users_in_matrix <= 1
            else "No neighbors found — ratings don't overlap with other users"
            if len(neighbors) == 0 and user_rating_count >= 5
            else "Below 5 ratings threshold"
            if user_rating_count < 5
            else f"OK — {len(neighbors)} neighbors found, CF should work"
        ),
    }
