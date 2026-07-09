from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..database import get_db
from ..models import UserRating, User, Anime
from ..schemas import RatingCreate, RatingOut
from ..auth import get_current_user

router = APIRouter(prefix="/user", tags=["Ratings"])


@router.post("/ratings", response_model=RatingOut, status_code=201)
def add_or_update_rating(
    rating_data: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    anime = db.query(Anime).filter(Anime.id == rating_data.anime_id).first()
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found")

    existing = (
        db.query(UserRating)
        .filter(
            UserRating.user_id == current_user.id,
            UserRating.anime_id == rating_data.anime_id
        )
        .first()
    )

    if existing:
        existing.score = rating_data.score
        db.commit()
        db.refresh(existing)
        return existing

    new_rating = UserRating(
        user_id=current_user.id,
        anime_id=rating_data.anime_id,
        score=rating_data.score,
    )
    db.add(new_rating)
    db.commit()
    db.refresh(new_rating)
    return new_rating


@router.get("/ratings", response_model=List[RatingOut])
def get_user_ratings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ratings = (
        db.query(UserRating)
        .options(joinedload(UserRating.anime))
        .filter(UserRating.user_id == current_user.id)
        .order_by(UserRating.created_at.desc())
        .all()
    )
    return ratings


@router.delete("/ratings/{anime_id}", status_code=204)
def delete_rating(
    anime_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rating = (
        db.query(UserRating)
        .filter(UserRating.user_id == current_user.id, UserRating.anime_id == anime_id)
        .first()
    )
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")
    db.delete(rating)
    db.commit()
