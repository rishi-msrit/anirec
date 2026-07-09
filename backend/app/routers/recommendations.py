from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import RecommendationResponse
from ..algorithms.collaborative import get_recommendations
from ..auth import get_current_user

router = APIRouter(prefix="/user", tags=["Recommendations"])


@router.get("/recommend", response_model=RecommendationResponse)
def get_recommendations_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recommendations = get_recommendations(user_id=current_user.id, db=db, top_n=10)

    return RecommendationResponse(
        user_id=current_user.id,
        recommendations=recommendations,
    )
