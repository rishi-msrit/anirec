import os
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..database import get_db
from ..models import User
from ..schemas import SignupRequest, LoginRequest, AuthResponse, UserOut
from ..auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    revoke_token,
    is_token_revoked,
    get_current_user,
    REFRESH_TOKEN_EXPIRE_DAYS,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

APP_ENV = os.getenv("APP_ENV", "development")
IS_PROD = APP_ENV == "production"


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=IS_PROD,
        samesite="none" if IS_PROD else "lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/auth",
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key="refresh_token",
        path="/auth",
        httponly=True,
        secure=IS_PROD,
        samesite="none" if IS_PROD else "lax",
    )


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(data: SignupRequest, response: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=data.email,
        username=data.username,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")

    access_token, _ = create_access_token(user.id)
    refresh_token, _ = create_refresh_token(user.id)
    set_refresh_cookie(response, refresh_token)

    return AuthResponse(access_token=access_token, user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token, _ = create_access_token(user.id)
    refresh_token, _ = create_refresh_token(user.id)
    set_refresh_cookie(response, refresh_token)

    return AuthResponse(access_token=access_token, user=UserOut.model_validate(user))


@router.post("/refresh", response_model=AuthResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")

    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    old_jti = payload.get("jti", "")
    if is_token_revoked(old_jti, db):
        raise HTTPException(status_code=401, detail="Token has been revoked")

    # Rotate: revoke old, issue new pair
    revoke_token(old_jti, db)

    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token, _ = create_access_token(user.id)
    new_refresh, _ = create_refresh_token(user.id)
    set_refresh_cookie(response, new_refresh)

    return AuthResponse(access_token=access_token, user=UserOut.model_validate(user))


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if token:
        try:
            payload = decode_token(token)
            revoke_token(payload.get("jti", ""), db)
        except Exception:
            pass
    clear_refresh_cookie(response)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
