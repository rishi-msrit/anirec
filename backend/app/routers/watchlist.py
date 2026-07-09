from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import Optional, List
from ..database import get_db
from ..models import Watchlist, User, Anime
from ..schemas import WatchlistCreate, WatchlistUpdate, WatchlistOut
from ..auth import get_current_user

router = APIRouter(prefix="/user", tags=["Watchlist"])


@router.post("/watchlist", response_model=WatchlistOut, status_code=201)
def add_to_watchlist(
    data: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    anime = db.query(Anime).filter(Anime.id == data.anime_id).first()
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found")

    existing = (
        db.query(Watchlist)
        .filter(Watchlist.user_id == current_user.id, Watchlist.anime_id == data.anime_id)
        .first()
    )
    if existing:
        existing.status = data.status
        db.commit()
        db.refresh(existing)
        return existing

    entry = Watchlist(
        user_id=current_user.id,
        anime_id=data.anime_id,
        status=data.status,
    )
    db.add(entry)
    try:
        db.commit()
        db.refresh(entry)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Anime already in watchlist")
    return entry


@router.get("/watchlist", response_model=List[WatchlistOut])
def get_watchlist(
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Watchlist)
        .options(joinedload(Watchlist.anime))
        .filter(Watchlist.user_id == current_user.id)
    )
    if status:
        query = query.filter(Watchlist.status == status)

    entries = query.order_by(Watchlist.added_at.desc()).all()
    return entries


@router.patch("/watchlist/{anime_id}", response_model=WatchlistOut)
def update_watchlist_status(
    anime_id: int,
    data: WatchlistUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = (
        db.query(Watchlist)
        .filter(Watchlist.user_id == current_user.id, Watchlist.anime_id == anime_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")
    entry.status = data.status
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/watchlist/{anime_id}", status_code=204)
def remove_from_watchlist(
    anime_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = (
        db.query(Watchlist)
        .filter(Watchlist.user_id == current_user.id, Watchlist.anime_id == anime_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")
    db.delete(entry)
    db.commit()
