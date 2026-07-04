from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..database import get_db
from ..models import UserRating, User, Anime
from ..schemas import RatingCreate, RatingOut

router = APIRouter(prefix="/user", tags=["Ratings"])


@router.post("/{user_id}/ratings", response_model=RatingOut, status_code=201)
def add_or_update_rating(
    user_id: int,
    rating_data: RatingCreate,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    anime = db.query(Anime).filter(Anime.id == rating_data.anime_id).first()
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found")

    existing = (
        db.query(UserRating)
        .filter(
            UserRating.user_id == user_id,
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
        user_id=user_id,
        anime_id=rating_data.anime_id,
        score=rating_data.score,
    )
    db.add(new_rating)
    db.commit()
    db.refresh(new_rating)
    return new_rating


@router.get("/{user_id}/ratings", response_model=List[RatingOut])
def get_user_ratings(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ratings = (
        db.query(UserRating)
        .options(joinedload(UserRating.anime))
        .filter(UserRating.user_id == user_id)
        .order_by(UserRating.created_at.desc())
        .all()
    )
    return ratings


@router.delete("/{user_id}/ratings/{anime_id}", status_code=204)
def delete_rating(user_id: int, anime_id: int, db: Session = Depends(get_db)):
    rating = (
        db.query(UserRating)
        .filter(UserRating.user_id == user_id, UserRating.anime_id == anime_id)
        .first()
    )
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")
    db.delete(rating)
    db.commit()

