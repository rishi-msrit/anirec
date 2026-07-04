from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import RecommendationResponse
from ..algorithms.collaborative import get_recommendations

router = APIRouter(prefix="/user", tags=["Recommendations"])


@router.get("/{user_id}/recommend", response_model=RecommendationResponse)
def get_recommendations_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    recommendations = get_recommendations(user_id=user_id, db=db, top_n=10)

    return RecommendationResponse(
        user_id=user_id,
        recommendations=recommendations,
    )

