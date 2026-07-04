from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Anime Schemas

class AnimeBase(BaseModel):
    title: str
    synopsis: Optional[str] = None
    genres: Optional[List[str]] = []
    average_rating: Optional[float] = None
    episode_count: Optional[int] = None
    year: Optional[int] = None
    external_id: Optional[int] = None
    image_url: Optional[str] = None


class AnimeCreate(AnimeBase):
    pass


class AnimeOut(AnimeBase):
    id: int

    class Config:
        from_attributes = True


class AnimePaginated(BaseModel):
    items: List[AnimeOut]
    total: int
    page: int
    pages: int


# User Schemas

class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5)


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


# Rating Schemas

class RatingCreate(BaseModel):
    anime_id: int
    score: int = Field(..., ge=1, le=10)


class RatingOut(BaseModel):
    id: int
    user_id: int
    anime_id: int
    score: int
    created_at: datetime
    anime: Optional[AnimeOut] = None

    class Config:
        from_attributes = True


# Watchlist Schemas

class WatchlistCreate(BaseModel):
    anime_id: int
    status: str = Field(..., pattern="^(watching|completed|plan-to-watch)$")


class WatchlistUpdate(BaseModel):
    status: str = Field(..., pattern="^(watching|completed|plan-to-watch)$")


class WatchlistOut(BaseModel):
    id: int
    user_id: int
    anime_id: int
    status: str
    added_at: datetime
    anime: Optional[AnimeOut] = None

    class Config:
        from_attributes = True


# Recommendation Schemas

class RecommendationItem(BaseModel):
    anime: AnimeOut
    predicted_score: float
    reason: str
    similar_users_count: int


class RecommendationResponse(BaseModel):
    user_id: int
    recommendations: List[RecommendationItem]
    algorithm: str = "User-User Collaborative Filtering (Cosine Similarity)"


# Dashboard Schemas

class UserStats(BaseModel):
    user_id: int
    total_rated: int
    total_watchlist: int
    average_score: Optional[float]
    favorite_genre: Optional[str]
    watching_count: int
    completed_count: int
    plan_to_watch_count: int

