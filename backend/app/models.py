from sqlalchemy import (
    Column, Integer, String, Text, Float, TIMESTAMP, CheckConstraint,
    ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    ratings = relationship("UserRating", back_populates="user", cascade="all, delete-orphan")
    watchlist = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")


class Anime(Base):
    __tablename__ = "animes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    synopsis = Column(Text)
    genres = Column(ARRAY(String(100)))
    average_rating = Column(Float)
    episode_count = Column(Integer)
    year = Column(Integer)
    external_id = Column(Integer, unique=True)
    image_url = Column(String(500))

    ratings = relationship("UserRating", back_populates="anime", cascade="all, delete-orphan")
    watchlist_entries = relationship("Watchlist", back_populates="anime", cascade="all, delete-orphan")


class UserRating(Base):
    __tablename__ = "user_ratings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    anime_id = Column(Integer, ForeignKey("animes.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, CheckConstraint("score >= 1 AND score <= 10"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "anime_id", name="uq_user_anime_rating"),
        Index("idx_user_ratings", "user_id", "anime_id"),
    )

    user = relationship("User", back_populates="ratings")
    anime = relationship("Anime", back_populates="ratings")


class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    anime_id = Column(Integer, ForeignKey("animes.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), nullable=False)
    added_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "anime_id", name="uq_user_anime_watchlist"),
        CheckConstraint(
            "status IN ('watching', 'completed', 'plan-to-watch')",
            name="chk_watchlist_status"
        ),
        Index("idx_watchlist", "user_id", "status"),
    )

    user = relationship("User", back_populates="watchlist")
    anime = relationship("Anime", back_populates="watchlist_entries")


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(255), unique=True, nullable=False, index=True)
    revoked_at = Column(TIMESTAMP, server_default=func.now())
