import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy.exc import IntegrityError

from .database import engine, SessionLocal
from .models import Base, User
from .routers import animes, users, ratings, watchlist, recommendations, dashboard

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)

    # Insert default demo user
    db = SessionLocal()
    try:
        demo = db.query(User).filter(User.email == "demo@anime.app").first()
        if not demo:
            demo_user = User(
                email="demo@anime.app",
                username="demo_user",
            )
            db.add(demo_user)
            db.commit()
            print("Demo user created: demo@anime.app (id=1)")
        else:
            print(f"Demo user already exists: id={demo.id}")
    except IntegrityError:
        db.rollback()
    finally:
        db.close()

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
        "https://*.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

