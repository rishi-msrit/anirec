from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models import Anime
from ..schemas import AnimeOut, AnimePaginated

router = APIRouter(prefix="/animes", tags=["Anime"])

ITEMS_PER_PAGE = 20


@router.get("", response_model=AnimePaginated)
def list_animes(
    search: Optional[str] = Query(None, description="Search by title"),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    sort: Optional[str] = Query("rating", description="Sort field"),
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
):
    query = db.query(Anime)

    if search:
        query = query.filter(Anime.title.ilike(f"%{search}%"))

    if genre:
        query = query.filter(Anime.genres.any(genre))

    sort_map = {
        "rating": Anime.average_rating.desc().nulls_last(),
        "title": Anime.title.asc(),
        "year": Anime.year.desc().nulls_last(),
        "episodes": Anime.episode_count.desc().nulls_last(),
    }
    order_clause = sort_map.get(sort, Anime.average_rating.desc().nulls_last())
    query = query.order_by(order_clause)

    total = query.count()

    offset = (page - 1) * ITEMS_PER_PAGE
    items = query.offset(offset).limit(ITEMS_PER_PAGE).all()

    pages = (total + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE if total > 0 else 1

    return AnimePaginated(
        items=items,
        total=total,
        page=page,
        pages=pages,
    )


@router.get("/{anime_id}", response_model=AnimeOut)
def get_anime(anime_id: int, db: Session = Depends(get_db)):
    anime = db.query(Anime).filter(Anime.id == anime_id).first()
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found")
    return anime

