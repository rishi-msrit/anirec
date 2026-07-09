import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .database import engine
from .models import Base
from .routers import animes, users, ratings, watchlist, recommendations, dashboard, auth

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="Anime Recommender API",
    description="REST API for browsing anime, managing watchlists, and collaborative filtering recommendations.",
    version="1.0.0",
    lifespan=lifespan,
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        FRONTEND_URL,
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(animes.router)
app.include_router(users.router)
app.include_router(ratings.router)
app.include_router(watchlist.router)
app.include_router(recommendations.router)
app.include_router(dashboard.router)

@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/", tags=["System"])
def root():
    return {
        "message": "Anime Recommender API",
        "docs": "/docs",
        "health": "/health",
    }
