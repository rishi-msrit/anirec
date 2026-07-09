from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import User, UserRating, Watchlist, Anime
from ..schemas import UserStats
from ..auth import get_current_user

router = APIRouter(prefix="/user", tags=["Dashboard"])


@router.get("/stats", response_model=UserStats)
def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = current_user.id

    total_rated = db.query(UserRating).filter(UserRating.user_id == user_id).count()

    avg_result = (
        db.query(func.avg(UserRating.score))
        .filter(UserRating.user_id == user_id)
        .scalar()
    )
    average_score = round(float(avg_result), 2) if avg_result else None

    watchlist_counts = {
        row.status: row.count
        for row in db.query(
            Watchlist.status, func.count(Watchlist.id).label("count")
        )
        .filter(Watchlist.user_id == user_id)
        .group_by(Watchlist.status)
        .all()
    }
    total_watchlist = sum(watchlist_counts.values())

    favorite_genre = None
    rated_animes = (
        db.query(Anime)
        .join(UserRating, UserRating.anime_id == Anime.id)
        .filter(UserRating.user_id == user_id, UserRating.score >= 7)
        .all()
    )
    if rated_animes:
        genre_counts: dict = {}
        for anime in rated_animes:
            for genre in (anime.genres or []):
                genre_counts[genre] = genre_counts.get(genre, 0) + 1
        if genre_counts:
            favorite_genre = max(genre_counts, key=genre_counts.get)

    return UserStats(
        user_id=user_id,
        total_rated=total_rated,
        total_watchlist=total_watchlist,
        average_score=average_score,
        favorite_genre=favorite_genre,
        watching_count=watchlist_counts.get("watching", 0),
        completed_count=watchlist_counts.get("completed", 0),
        plan_to_watch_count=watchlist_counts.get("plan-to-watch", 0),
    )
