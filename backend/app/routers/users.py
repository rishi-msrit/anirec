from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserOut

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", response_model=UserOut, status_code=201)
def create_or_get_user(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        if existing.username != user_data.username:
            existing.username = user_data.username
            db.commit()
            db.refresh(existing)
        return existing

    new_user = User(
        email=user_data.email,
        username=user_data.username,
    )
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")
    return new_user


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

