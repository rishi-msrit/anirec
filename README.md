# AniRec: A User-User Collaborative Filtering Watchlist & Recommendation Engine

A full-stack anime discovery app built as a college project. You can browse 500+ real anime, track your watchlist, rate shows, and get personalized recommendations based on what similar users liked — all powered by a collaborative filtering engine written from scratch in pure Python, no ML libraries.

**Live:** https://anirec-rishi.vercel.app
***(Refer guide.txt for in depth guide)
---

## What it does

- **Browse** — 500+ anime from MyAnimeList with search and genre filters
- **Rate** — Score anime 1–10. The more you rate, the better your recommendations get
- **Watchlist** — Keep track of what you're Watching, Completed, or Plan to Watch
- **For You** — Top 10 personalized picks using User-User Collaborative Filtering
- **Dashboard** — Your stats: ratings count, average score, favourite genre, and a donut chart of your watchlist breakdown
- **Guest mode** — Browse freely without an account. Sign up only when you want to save stuff

---

## Stack

| Layer | Tech | Hosted on |
|---|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS | Vercel |
| Backend | FastAPI (Python 3.11), SQLAlchemy ORM | Render |
| Database | PostgreSQL | Neon (serverless) |

---

## Authentication

The app uses a production-grade JWT auth system:

- Passwords are hashed with **bcrypt** via passlib — never stored in plain text
- On login, you get a short-lived **access token** (15 min) stored only in memory (never localStorage)
- A long-lived **refresh token** (7 days) is stored in an **httpOnly cookie** — invisible to JavaScript, XSS-safe
- On every `/auth/refresh` call, the old refresh token is revoked and a new pair is issued (rotation)
- Protected routes (`/ratings`, `/watchlist`, `/recommendations`, `/stats`) identify the user from the token, not the URL
- A `revoked_tokens` table tracks invalidated JTIs so stolen tokens can't be replayed
- Email format is validated server-side with Pydantic's `EmailStr`

Auth endpoints:
```
POST /auth/signup   — create account (username, email, password)
POST /auth/login    — get token pair
POST /auth/refresh  — rotate tokens using httpOnly cookie
POST /auth/logout   — revoke refresh token
GET  /auth/me       — get current user
```

---

## How the recommendation engine works

Pure Python, no scikit-learn or any ML library. It uses **User-User Collaborative Filtering with Cosine Similarity**.

```
Rating matrix:
         Anime A  Anime B  Anime C  Anime D
User 1:    8        6        -        9
User 2:    7        -        8        9
User 3:    -        5        9        -
You:       9        7        -        -

Step 1: Cosine similarity between you and every other user
  shared anime with User 1: A, B
  similarity = (9×8 + 7×6) / (√(81+49) × √(64+36)) = 114 / 114 ≈ 1.0

Step 2: Pick the top 20 most similar users (K=20 neighbors)

Step 3: For each anime you haven't seen, predict your score
  Anime C: only User 2 rated it (score=8, sim=0.87)
  predicted = (0.87 × 8) / 0.87 = 8.0

Step 4: Rank all predicted anime, return the top 10
```

**Similarity formula:**
```
cosine_sim(a, b) = (a · b) / (||a|| × ||b||)
```

**Cold start:** if you have fewer than 5 ratings, you see the community's top-rated anime instead of personalized picks.

**Performance:** ~120ms average on the seeded dataset (100 synthetic users, 500 anime, ~4800 ratings). P95 under 200ms.

---

## Database schema

```sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  username      VARCHAR(100) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE animes (
  id             SERIAL PRIMARY KEY,
  title          VARCHAR(255) NOT NULL,
  synopsis       TEXT,
  genres         VARCHAR(100)[],
  average_rating FLOAT,
  episode_count  INT,
  year           INT,
  external_id    INT UNIQUE,
  image_url      VARCHAR(500)
);

CREATE TABLE user_ratings (
  id        SERIAL PRIMARY KEY,
  user_id   INT REFERENCES users(id) ON DELETE CASCADE,
  anime_id  INT REFERENCES animes(id) ON DELETE CASCADE,
  score     INT CHECK (score >= 1 AND score <= 10),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, anime_id)
);

CREATE TABLE watchlist (
  id        SERIAL PRIMARY KEY,
  user_id   INT REFERENCES users(id) ON DELETE CASCADE,
  anime_id  INT REFERENCES animes(id) ON DELETE CASCADE,
  status    VARCHAR(50) CHECK (status IN ('watching', 'completed', 'plan-to-watch')),
  added_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, anime_id)
);

CREATE TABLE revoked_tokens (
  id         SERIAL PRIMARY KEY,
  jti        VARCHAR(255) UNIQUE NOT NULL,
  revoked_at TIMESTAMP DEFAULT NOW()
);
```

Genres are stored as native PostgreSQL arrays — lets you do `WHERE 'Action' = ANY(genres)` without joins.

---

## Running locally

**Prerequisites:** Node.js 18+, Python 3.11+, Docker

### 1. Clone
```bash
git clone https://github.com/rishi-msrit/anirec.git
cd anirec
```

### 2. Start a local PostgreSQL instance
```bash
docker run --name anime_postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=anime_db \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET
uvicorn app.main:app --reload --port 8000
```

API docs at http://localhost:8000/docs

### 4. Seed the database
```bash
python scripts/seed_animes.py   # pulls 500 anime from Jikan (MAL API)
python scripts/seed_users.py    # creates 100 synthetic users with taste profiles
```

### 5. Frontend
```bash
cd ../frontend
npm install
npm run dev
```

App at http://localhost:3000

---

## Tests

Unit tests for the collaborative filtering algorithm (no DB needed):

```bash
cd backend
python -m pytest tests/test_collaborative.py -v
```

Tests cover: cosine similarity bounds, neighbor ranking, weighted score prediction, cold-start fallback, edge cases. All 13 pass.

---

## Deployment notes

- Backend on Render's free tier — **spins down after 15 min of inactivity**, so the first request after idle takes ~30 seconds to respond. This is a free tier limitation, not a bug.
- Required env vars on Render: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `APP_ENV=production`
- Required env var on Vercel: `NEXT_PUBLIC_API_URL` (your Render URL, no trailing slash)
- Refresh tokens use `SameSite=None; Secure` — required for cross-origin cookie support between Vercel and Render
