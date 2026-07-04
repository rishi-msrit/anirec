# AniRec - Anime Watchlist & Recommendation System

A full-stack anime discovery platform with personalized recommendations powered by User-User Collaborative Filtering. Built with a pure algorithmic engine without external ML libraries.

The UI design is inspired by modern, real-life anime platforms, delivering a premium, contemporary visual experience with rich glassmorphism, tailored dark tones, and clean grids.

Live Link: https://anirec-rishi.vercel.app/

---

## Features

| Feature | Description |
|---------|-------------|
| **Browse** | 500+ real anime from MyAnimeList, search and filter by genre |
| **Rate** | Score anime 1–10, tracking user taste profile |
| **Watchlist** | Track Watching, Completed, and Plan-to-Watch shows |
| **Recommendations** | Top 10 personalized picks via Collaborative Filtering algorithm |
| **Dashboard** | Stats, SVG donut chart distribution, and recent activity |
| **Demo Auth** | Username-only login stored in localStorage (no password required) |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Next.js 14 Frontend (Vercel)              │
│  - Browse page (grid, search, filter)       │
│  - Anime detail (rate + watchlist)          │
│  - Recommendations feed (top 10)            │
│  - Watchlist (3 status tabs)                │
│  - Dashboard (stats + donut chart)          │
└────────────────┬────────────────────────────┘
                 │ REST API
                 ▼
┌─────────────────────────────────────────────┐
│  FastAPI Backend (Render)                   │
│  GET  /animes?search=&genre=&sort=          │
│  GET  /animes/{id}                          │
│  POST /users                                │
│  POST /user/{id}/ratings (upsert)           │
│  GET  /user/{id}/ratings                    │
│  POST /user/{id}/watchlist                  │
│  GET  /user/{id}/watchlist?status=          │
│  PATCH /user/{id}/watchlist/{anime_id}      │
│  GET  /user/{id}/recommend                  │
│  GET  /user/{id}/stats                      │
└────────────────┬────────────────────────────┘
                 │ SQLAlchemy ORM
                 ▼
┌─────────────────────────────────────────────┐
│  PostgreSQL Database (Neon or Supabase)     │
│  users | animes | user_ratings | watchlist  │
└─────────────────────────────────────────────┘
```

---

## Collaborative Filtering Algorithm

### How It Works

The recommendation engine uses User-User Collaborative Filtering with Cosine Similarity, written in pure Python.

### Step-by-Step Example

```
Rating matrix:
         Anime A  Anime B  Anime C  Anime D
User 1:    8        6        -        9
User 2:    7        -        8        9
User 3:    -        5        9        -
Target:    9        7        -        -    (Target user ratings)

Step 1: Cosine similarity (Target vs User 1)
  shared animes: A, B
  dot product = (9*8) + (7*6) = 72 + 42 = 114
  ||Target|| = sqrt(81+49) = sqrt(130) ≈ 11.40
  ||User1||  = sqrt(64+36) = sqrt(100) = 10
  similarity = 114 / (11.40 * 10) = 1.0 (Very similar)

Step 2: Find top neighbors (K=20)
  Sorted by similarity: User1 (1.0) > User2 (0.87) > User3 (0.0)

Step 3: Predict score for unseen anime (Anime C)
  Only User2 rated Anime C -> score = 8, sim(Target, User2) = 0.87
  predicted = (0.87 * 8) / 0.87 = 8.0

Step 4: Rank all predicted shows and return the top 10.
```

### Similarity Formula

```
cosine_sim(a, b) = (a · b) / (||a|| × ||b||)

where:
  a · b = sum(a_i * b_i) for shared anime i
  ||a|| = sqrt(sum(a_i^2)) over all anime user a rated
```

### Time Complexity & Latency
- **Time Complexity**: O(U * A) where U is the number of users and A is the average number of anime rated per user.
- **Latency**: Under 200ms for the seeded dataset (100 users, 500 anime).
- **Cold Start**: Users with 0 ratings receive globally top-rated anime.

---

### Hosting servces
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS. Hosted on: Vercel (Free Tier)
- **Backend API**: FastAPI (Python 3.11) + SQLAlchemy ORM Hosted on: Render (Free Web Service Tier, deployed via a Python/Docker container)
- **Database**: Hosted on: Neon.tech (Free Serverless Database Tier)
- **Data Seeding**: Live dataset of 500 real anime from MyAnimeList (via Jikan API) + 100 synthetic users with ~4,800 custom taste ratings for realistic recommendation results.

---
 
## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Anime library (seeded via Jikan API)
CREATE TABLE animes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  synopsis TEXT,
  genres VARCHAR(100)[],
  average_rating FLOAT,
  episode_count INT,
  year INT,
  external_id INT UNIQUE,
  image_url VARCHAR(500)
);

-- User ratings
CREATE TABLE user_ratings (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  anime_id INT REFERENCES animes(id) ON DELETE CASCADE,
  score INT CHECK (score >= 1 AND score <= 10),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, anime_id)
);

-- Watchlist
CREATE TABLE watchlist (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  anime_id INT REFERENCES animes(id) ON DELETE CASCADE,
  status VARCHAR(50) CHECK (status IN ('watching', 'completed', 'plan-to-watch')),
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, anime_id)
);

-- Performance Indexes
CREATE INDEX idx_user_ratings ON user_ratings(user_id, anime_id);
CREATE INDEX idx_watchlist ON watchlist(user_id, status);
```

---

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker (for local PostgreSQL)

### 1. Setup Project
```bash
git clone <your-repo-url>
cd anime-recommender
```

### 2. Start PostgreSQL
```bash
docker run --name anime_postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=anime_db \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
Backend runs at http://localhost:8000. Interactive docs are at http://localhost:8000/docs.

### 4. Seed Database
```bash
# Seed 500 top anime from MAL (respects API rate limits)
python scripts/seed_animes.py

# Seed 100 synthetic users with realistic taste profiles
python scripts/seed_users.py
```

### 5. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs at http://localhost:3000.

---

## API Documentation

### GET /animes
List and search anime with pagination.
```
GET /animes?search=naruto&genre=Action&sort=rating&page=1
```

### POST /users
Create or retrieve a user (idempotent).
```json
POST /users
{
  "username": "my_username",
  "email": "my_username@anime.app"
}
```

### POST /user/{user_id}/ratings
Add or update a rating.
```json
POST /user/42/ratings
{
  "anime_id": 1,
  "score": 9
}
```

### GET /user/{user_id}/recommend
Get 10 personalized recommendations.
```json
GET /user/42/recommend
```

---

## Verification & Testing

### Algorithm Unit Tests
Unit tests are available in `backend/tests/test_collaborative.py`. They run independently of the database to verify:
- Cosine similarity boundaries [0, 1]
- Neighbor retrieval and ranking sorting
- Weighted score predictions
- Handling of unseen items

To run the unit tests:
```bash
cd backend
python -m pytest tests/test_collaborative.py -v
```

All 13 unit tests compile and pass successfully.

### Performance Test
A performance benchmark script is available at `backend/scripts/perf_test.py` to evaluate recommendation speed on the seeded dataset:
```bash
python scripts/perf_test.py
```
- **Result**: Average calculation latency is ~120ms (P95 under 200ms), meeting the latency requirement (<500ms) with a high safety margin.

---

## Deployment

### Frontend (Vercel)
1. Push the code to a GitHub repository.
2. Import the repository into Vercel.
3. Configure the Root Directory to `frontend`.
4. Add the environment variable `NEXT_PUBLIC_API_URL` pointing to your deployed backend URL.

### Backend & Database (Render + Neon)
1. Create a free PostgreSQL instance on [Neon](https://neon.tech). Copy the connection string.
2. Create a free Web Service on [Render](https://render.com) pointing to the `backend` folder.
3. Set the environment variables `DATABASE_URL` (your Neon connection string) and `FRONTEND_URL` (your Vercel URL).
4. Set the build command to `pip install -r requirements.txt` and start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

---

## Key Design Decisions

- **Local Storage Auth**: A simple username-only system is used to keep the portfolio focus on the recommendations engine and database design.
- **PostgreSQL Arrays**: Genres are stored as native array fields to allow high-performance filtering without complex joins.
- **community top picks fallback**: When a user has not rated any anime, recommendations fall back to global top-rated anime.
