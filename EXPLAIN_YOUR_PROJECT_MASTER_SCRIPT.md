# EXPLAIN YOUR PROJECT — IN-DEPTH INTERVIEW MASTER SCRIPT
## Project: AniRec (Full-Stack Anime Watchlist & Recommendation Engine)

> **How to use this document:**  
> This is a complete, spoken-style master script designed to be read before your interview. It is written in the first person ("I built...", "My architectural goal was...") and covers every single layer of the application end-to-end. Every technical term and jargon is explained right there in brackets so you never stumble or wonder what a term means while speaking.

---

## 1. THE OPENING HOOK, MOTIVATION & PROBLEM STATEMENT

"To explain my project from the ground up: I built **AniRec**, a full-stack anime tracking and discovery platform with a custom-engineered recommendation engine written from scratch in pure Python.

Before writing a single line of code, I started with a very specific problem that almost every anime enthusiast faces: **choice paralysis and popularity bias**. 

If you look at mainstream anime platforms today—like MyAnimeList or AniList—the discovery experience is almost entirely dictated by global popularity rankings. When a user clicks 'Top Anime', they see shows like *Fullmetal Alchemist: Brotherhood*, *Attack on Titan*, or *Steins;Gate*. While those are great shows, global averages completely fail users who have distinct or niche tastes. For example, if someone loves 1990s psychological sci-fi like *Serial Experiments Lain* or *Neon Genesis Evangelion*, a generic top-10 list full of mainstream shonen battle anime is useless to them. 

Without a system like AniRec, a viewer has to manually browse internet forums, read through endless Reddit threads, or manually cross-reference user profiles to find shows that match their aesthetic.

I wanted to solve this by building a platform that doesn't just ask *'What is popular globally?'*, but instead mathematically asks:  
**'Who in this community rates anime most similarly to you, and what did they love that you haven't watched yet?'**

To make this a complete product, I didn't just build an isolated machine learning script. I built a complete, production-grade web application featuring:
1. A modern, responsive frontend with live search, genre filtering, and an interactive personal analytics dashboard.
2. A full watchlist management system that tracks shows across three lifecycle states: *Watching*, *Completed*, and *Plan to Watch*.
3. A 1-to-10 scoring system with optimistic UI updates.
4. An enterprise-grade, dual-token authentication system using JSON Web Tokens *(JWT: a secure, digitally signed string used to verify user identity)* with short-lived in-memory tokens and rotating httpOnly cookies.
5. And most importantly, a **User-User Collaborative Filtering recommendation engine** built entirely from first principles in pure Python, without relying on black-box machine learning libraries like Scikit-Learn or Surprise."

---

## 2. HIGH-LEVEL ARCHITECTURE & TECH STACK OVERVIEW

"Architecturally, AniRec follows a clean, decoupled **Client-Server Architecture** *(which means the frontend user interface and the backend business logic run as completely independent systems that talk to each other strictly through HTTP REST APIs)*.

Let me break down the technologies I chose for each layer and why:

### The Frontend Layer
* **Next.js 14 with the App Router** *(Next.js is a React-based framework that provides routing, layout optimization, and production-grade build tools)*. I used Next.js paired with **React 18** and **TypeScript** *(TypeScript is a statically typed superset of JavaScript that catches bugs during compilation by enforcing strict data shapes)*.
* **Tailwind CSS** *(a utility-first CSS framework that lets you style elements directly in your markup using pre-defined class names)*.
* **Why this frontend stack?** Instead of using an un-opinionated setup like Vite with plain React, Next.js 14 gives me a modern file-system router, clean layout nesting, and optimized font loading. I used TypeScript because when dealing with complex objects like anime metadata, user ratings, and recommendation scores, having compile-time type safety ensures the frontend contracts match the backend schemas exactly.

### The Backend Layer
* **FastAPI on Python 3.11** *(FastAPI is a modern, high-performance web framework for building APIs in Python)* running on top of **Uvicorn** *(an ASGI web server, which stands for Asynchronous Server Gateway Interface, allowing Python to handle concurrent, non-blocking network connections)*.
* **SQLAlchemy 2.0** *(an ORM, or Object-Relational Mapper, which is a library that allows you to interact with your relational database using Python classes and objects instead of writing raw SQL strings)*.
* **Pydantic v2** *(a data validation and parsing library that automatically inspects incoming request payloads and verifies that every field matches the required type and constraints before running any business logic)*.
* **Why FastAPI instead of Flask or Django?** Django is way too heavyweight and monolithic for a decoupled REST API—it comes bundled with an admin panel, template engine, and session middleware that I did not need. Flask, on the other hand, is too bare-bones and requires installing multiple third-party plugins for validation, serialization, and async handling. FastAPI was the sweet spot: it gives me native asynchronous request handling, built-in dependency injection for database sessions and auth guards, automatic Swagger documentation at `/docs`, and rock-solid validation via Pydantic.

### The Database & Infrastructure Layer
* **PostgreSQL** hosted on **Neon.tech** *(a serverless, cloud-hosted PostgreSQL service that automatically scales compute resources)*.
* **Why PostgreSQL instead of MongoDB?** Entertainment tracking is inherently relational: users create ratings, users have watchlists, ratings link to specific anime, and anime belong to genres. Relational databases give us referential integrity *(guaranteeing that a rating cannot point to a non-existent user or anime)*, composite unique constraints *(preventing duplicate ratings)*, and foreign-key cascading deletes *(meaning if a user account is deleted, all their ratings and watchlist entries are automatically purged)*. PostgreSQL also natively supports an `ARRAY` data type, which allowed me to store an anime's multiple genres directly in a column without needing a bloated many-to-many join table for a fixed catalog.
* **Deployment:** The frontend is deployed globally on **Vercel** *(a cloud platform optimized for Next.js applications)*, and the backend is deployed as a Web Service on **Render** *(a cloud hosting platform that runs containerized web servers)*."

---

## 3. FRONTEND ENGINEERING & USER WORKFLOWS

"Now, let me walk you through what happens on the client side when a user interacts with the application.

### Browsing, Search & Debouncing
When a user opens the home page, they see a clean, dark-themed catalog of 500+ anime titles fetched from `/animes`. In the sidebar, they can filter by genre, sort by average rating, release year, title, or episode count, and search by title in real-time.

A key engineering detail here is **Debouncing** in `SearchSidebar.tsx`.  
*(Debouncing is a programming pattern where you delay executing a function until a certain amount of time has passed since the user last pressed a key.)*  
If I sent an HTTP request to the backend on every single keystroke, typing 'Attack on Titan' would fire 15 separate network requests in less than two seconds, overwhelming the database. Instead, I implemented a 350-millisecond timer using a `useEffect` hook. When the user types, the timer resets; only when the user pauses typing for at least 350ms does the app trigger the API call.

The catalog also implements **Server-Side Pagination** *(fetching only 20 records at a time using SQL `OFFSET` and `LIMIT`)* rather than downloading all 500 titles at once. This keeps the initial page load lightweight and minimizes client-side memory consumption.

### The Watchlist System
When a logged-in user wants to track a show, they can toggle its status directly from the anime card or detail page. The application enforces three strict lifecycle states:
1. **Watching** (shows currently in progress)
2. **Completed** (shows finished)
3. **Plan to Watch** (shows queued for the future)

On the `/watchlist` page, users have access to filtered tabs with badge counters showing how many titles exist in each category. Users can change the status via a dropdown or remove an item with a single click.

### The Analytics Dashboard & Custom SVG Donut Chart
On the `/dashboard` page, users can review their personal viewing statistics. It displays their total rated count, total watchlist count, overall average score, and their **Favorite Genre** *(which the backend calculates by analyzing all anime the user rated 7 or higher and finding the statistical mode—the most frequently occurring genre tag)*.

One detail I am particularly proud of is the **Donut Chart** representing the user's watchlist distribution. Instead of installing a massive charting library like Chart.js or Recharts—which would add hundreds of kilobytes of unnecessary JavaScript to the bundle—I built the donut chart from scratch using pure **SVG math** in React.  
*(SVG stands for Scalable Vector Graphics, which are XML-based vector images rendered natively by the browser.)*  
I used simple geometry: for a circle with radius $r=54$, the circumference is $2 \times \pi \times 54 \approx 339.29$ pixels. By dynamically setting SVG `strokeDasharray` *(which defines the pattern of dashes and gaps in an outline)* and `strokeDashoffset` *(which defines where the stroke begins along the path)*, each category—Watching, Completed, and Plan to Watch—renders as an animated colored arc that sums up to 100% of the circle."

---

## 4. THE HEART OF THE PROJECT: THE COLLABORATIVE FILTERING ENGINE

"Now, I want to dive into what is truly the centerpiece of this project: the **Recommendation Engine** located in `backend/app/algorithms/collaborative.py`.

When I set out to build this, I deliberately chose **not** to import machine learning frameworks like Scikit-Learn, PyTorch, or Surprise. Anyone can write `model.fit()` and `model.predict()`, but doing so hides the actual mechanics. I wanted to demonstrate a complete mathematical understanding of vector spaces, similarity metrics, and prediction math by building it entirely from scratch in pure Python.

I implemented **Memory-Based User-User Collaborative Filtering**. Here is the exact step-by-step process of how a recommendation is calculated when an authenticated user requests `/user/recommend`:

### Step 1: Building the Sparse Rating Matrix
The function `_build_rating_matrix` queries all records from the `user_ratings` table in PostgreSQL. It loads them into a sparse Python dictionary of dictionaries structured as:
```python
{
    user_id: { anime_id: score }
}
```
*(A sparse matrix is simply a mathematical matrix where most elements are zero or empty because no single user has watched all 500 anime titles.)*

### Step 2: Cosine Similarity Vector Calculation
Next, we need to determine how similar the target user's taste is to every other user in the database. To do this, I treat each user's ratings as a mathematical vector in a 500-dimensional anime space.

To measure the alignment between the target user vector $\mathbf{u}$ and a candidate user vector $\mathbf{v}$, I calculate their **Cosine Similarity** *(a mathematical metric that measures the cosine of the angle between two vectors projected in a multi-dimensional space)*:

$$\text{Cosine Similarity}(u, v) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \times \|\mathbf{v}\|} = \frac{\sum_{i \in I_{uv}} (r_{u,i} \times r_{v,i})}{\sqrt{\sum_{i \in I_u} (r_{u,i})^2} \times \sqrt{\sum_{j \in I_v} (r_{v,j})^2}}$$

Let me explain what this equation actually does in code without getting lost in notation:
1. **The Numerator (Dot Product):** First, we find the intersection of anime rated by *both* users ($I_{uv}$). If there are zero mutual anime, the similarity is immediately $0.0$. If there are mutual anime, we multiply their scores together for each shared anime and sum them up. For example, if both users watched *Death Note* and *Cowboy Bebop*, and rated them (9, 8) and (8, 9), the dot product is $(9 \times 8) + (8 \times 9) = 72 + 72 = 144$.
2. **The Denominator (Vector Magnitudes / Euclidean Norms):** We calculate the length or magnitude of each user's *entire* rating vector across all shows they've ever rated: $\sqrt{\sum \text{score}^2}$.
3. **Why normalize against the entire vector?** This is a critical design detail. If you only normalized using the shared anime, then two users who overlapped on just one show and both gave it a 10 would have a similarity of $1.0$ (100% match), which is a statistical false positive! By dividing by the magnitude of their complete rating catalogs, the algorithm penalizes accidental one-show overlaps and rewards sustained taste alignment across large catalogs.
4. The result is strictly clamped between $0.0$ (completely dissimilar or no overlap) and $1.0$ (identical taste).

### Step 3: Top-K Neighbor Selection ($K=20$)
The algorithm calculates this cosine similarity against all other users in the system. It filters out anyone with a similarity of $0.0$, sorts the remaining users in descending order of similarity, and extracts the top 20 closest taste soulmates ($K=20$ nearest neighbors).

### Step 4: Weighted Score Prediction for Unseen Anime
Now, we want to know: *'What did these 20 neighbors watch that our target user has not yet watched?'*

For every anime in the neighbors' catalogs that does not exist in the target user's rated list, the algorithm predicts what score the target user would give it using a **Similarity-Weighted Average**:

$$\hat{r}_{u,i} = \frac{\sum_{v \in \text{Neighbors}} (\text{Similarity}(u, v) \times r_{v,i})}{\sum_{v \in \text{Neighbors}} \text{Similarity}(u, v)}$$

Why a weighted average instead of a simple average? Because not all neighbors are equally close! If Neighbor A has a 95% taste similarity with you and rated a show 10, their opinion should count far more than Neighbor B who only has a 40% similarity and rated it a 6. By multiplying each neighbor's score by their similarity and dividing by the sum of similarities, we get an accurate, normalized predicted score between 1.0 and 10.0.

### Step 5: Ranking, Explainability & Cold-Start Handling
The engine sorts all predicted anime by their predicted score descending and takes the top 10 titles. 

Then, it constructs a human-readable **Explainability String** in `_build_reason()`. For example, it might return:  
*'4 users with similar taste loved this anime (Sci-Fi, Thriller) with predicted score of 9.2/10'*.  
This gives the user instant trust and context on *why* the show is on their screen.

**How does it handle the Cold-Start Problem?**  
*(The cold-start problem is a classic recommender challenge where a new user has no rating history, making similarity math impossible.)*  
If a user has no ratings in the database, the engine automatically catches this and invokes `_cold_start_recommendations`. It queries the highest community-rated shows in the database that the user hasn't seen and serves them as an initial baseline with a helpful banner telling the user to rate titles to unlock personalized picks."

---

## 5. AUTHENTICATION & SECURITY ARCHITECTURE

"Next, I want to talk about how security and authentication are handled, because I treated this as a production-ready application rather than a toy project.

Many tutorials tell beginners to store JWT tokens in the browser's `localStorage`. Doing that is an immediate security vulnerability because `localStorage` is completely accessible to JavaScript. If your app includes a compromised third-party script or suffers from an **XSS** *(Cross-Site Scripting, an attack where malicious JavaScript is injected into a trusted website)*, an attacker can simply execute `localStorage.getItem("token")` and hijack the account.

To prevent this, I designed a **Dual-Token, In-Memory + HttpOnly Cookie Architecture**:

1. **Short-Lived Access Token (15 Minutes):**
   * Stored **strictly in JavaScript memory** inside a closure in `api.ts`. It is never written to `localStorage`, `sessionStorage`, or cookies.
   * If an attacker injects a script, there is no persistent storage location for them to read the token from.
   * Every authenticated request sends this token in the header as:  
     `Authorization: Bearer <access_token>`.

2. **Long-Lived Refresh Token (7 Days):**
   * Stored in an **`httpOnly` Cookie**.  
     *(An httpOnly cookie is a browser cookie with a special flag that completely forbids client-side JavaScript from reading or modifying it.)*
   * It has `SameSite=Lax` (or `None` with `Secure=True` in production HTTPS) and is scoped strictly to `path="/auth"`, protecting it against **CSRF** *(Cross-Site Request Forgery, an exploit where unauthorized commands are transmitted from a user that the web application trusts)*.

3. **Automatic Token Rotation & Revocation:**
   * When a user calls `/auth/refresh`, the server extracts the refresh token from the cookie.
   * Inside the token payload is a unique **`jti`** *(JWT ID, a unique UUID assigned to every token)*.
   * The server checks if this `jti` is in the `revoked_tokens` table. If it has been revoked, the request is rejected immediately.
   * If valid, the backend **revokes the old refresh token JTI**, issues a brand new access token, and issues a brand new refresh token with a new JTI. This pattern is called **Refresh Token Rotation**, and it guarantees that if a refresh token is ever intercepted, it can only be used once before being invalidated.

4. **The Frontend 401 Interceptor:**
   * In `frontend/src/lib/api.ts`, my custom `fetchJson` wrapper intercepts every response.
   * When an access token expires after 15 minutes, the backend returns `401 Unauthorized`.
   * The frontend catches this 401, pauses, calls `/auth/refresh` behind the scenes using the httpOnly cookie, stores the new access token in memory, and automatically retries the original request without the user ever noticing or getting logged out.
   * To prevent race conditions if multiple components fire requests at the same time, I used an `isRefreshing` promise lock so only one refresh call is made."

---

## 6. DATABASE DESIGN & DATA MODELING

"Moving to the database: in `backend/app/models.py`, I defined five relational tables using SQLAlchemy:

1. **`users`:** Stores `id`, `username`, `email`, `password_hash`, and `created_at`. Passwords are never stored in plaintext—they are hashed using **bcrypt** via Passlib with an adaptive work factor and unique salts.
2. **`animes`:** Stores the catalog metadata: `title`, `synopsis`, `average_rating`, `episode_count`, `year`, `image_url`, and `external_id` (the MyAnimeList ID). The `genres` column is configured as a native PostgreSQL `ARRAY(String(100))`.
3. **`user_ratings`:** Connects a `user_id` to an `anime_id` with a `score` integer.
   * It enforces a SQL Check Constraint: `score >= 1 AND score <= 10`.
   * It has a composite unique constraint: `uq_user_anime_rating` on `(user_id, anime_id)`, guaranteeing that a user can never have two conflicting rows for the same show.
   * It has a composite B-tree index `idx_user_ratings` to allow lightning-fast matrix generation.
4. **`watchlist`:** Connects `user_id` and `anime_id` with a `status` string.
   * It enforces a Check Constraint: `status IN ('watching', 'completed', 'plan-to-watch')`.
   * It has a composite unique constraint `(user_id, anime_id)` and an index on `(user_id, status)`.
5. **`revoked_tokens`:** Stores revoked token `jti` strings and revocation timestamps to enforce logout and rotation blacklists.

In `database.py`, I configured the SQLAlchemy engine with **Connection Pooling** using `pool_size=10` and `max_overflow=20`. Crucially, I set `pool_pre_ping=True`.  
*(Connection pooling maintains a cache of active database connections so the app doesn't have to pay the TCP handshake cost on every query. The `pool_pre_ping` setting issues a lightweight test query `SELECT 1` before handing out a connection. This is vital for serverless PostgreSQL like Neon, where idle connections can be terminated by the cloud provider.)*"

---

## 7. DATA PIPELINE & SEEDING

"To populate the system with realistic data so the collaborative filtering algorithm could be tested and demonstrated effectively, I wrote two data ingestion scripts:

1. **`seed_animes.py`:**
   * This script connects to the **Jikan API v4** *(the open-source REST API for MyAnimeList)*.
   * It fetches the top 500 anime titles in pages of 25 using `httpx`.
   * To prevent getting HTTP 429 rate-limited by Jikan, I built an automated throttling loop with `time.sleep(0.4)`.
   * It parses titles, synopses, genres, release years, and poster image URLs, and bulk inserts them into PostgreSQL while skipping any existing `external_id` records.

2. **`seed_users.py`:**
   * An algorithm needs real user patterns to discover clusters of taste. If you fill a database with completely uniform random numbers, everyone has a 0.5 similarity with everyone else and recommendations become meaningless noise.
   * To solve this, I wrote a synthetic generator that creates 100 users with clustered taste preferences. Each user is assigned 1 to 3 'favorite genres' (like Sci-Fi and Psychological). When generating 20 to 80 ratings per user, the script intentionally skews 60% of their catalog toward their favorite genres with high scores (7 to 10), and distributes lower scores across other genres. This produced ~4,800 ratings with realistic mathematical correlations."

---

## 8. DIFFICULTIES ENCOUNTERED & ENGINEERING CHALLENGES

"If you ask me what the hardest engineering challenges were while building AniRec, three distinct problems stand out:

### 1. The Vector Dot Product Normalization Bug
Early on, my collaborative filtering algorithm was recommending the exact same three popular shows to almost everyone. When I traced the vector math, I discovered that I was only calculating vector magnitudes over the *shared* anime. If User A and User B only shared a single show and both rated it a 10, their cosine similarity evaluated to $1.0$. That single overlap completely overpowered users who shared 30 shows with high correlation!  
I fixed this by ensuring the Euclidean norm in the denominator evaluates across the user's **entire rating history**. This properly penalized coincidental one-off overlaps and surfaced genuine taste twins.

### 2. Handling Serverless Database Drops & Free Tier Spin-Downs
Because I hosted the backend on Render's free tier and PostgreSQL on Neon serverless, I had to deal with cold starts and dropped connections.
* First, Neon would drop idle connections after a period of inactivity, causing SQLAlchemy to throw `OperationalError: SSL connection has been closed unexpectedly`. I resolved this by enabling `pool_pre_ping=True` in the engine settings.
* Second, Render's free tier spins down the web container after 15 minutes of inactivity, meaning the first API call can take 30 to 45 seconds to respond. On the frontend in `Navbar.tsx`, I caught fetch failures and added explicit user feedback: *'Server is waking up (free tier). Please wait 30 seconds and try again'* so the user never assumes the app is broken.

### 3. Concurrency & Token Refresh Race Conditions
When a user with an expired access token opens a page like `/dashboard`, two API calls fire in parallel via `Promise.all`: `userApi.getStats()` and `ratingsApi.list()`. Both requests return a 401 simultaneously. If both triggered a refresh call at the same time, the second call would send an already-revoked refresh token JTI, triggering a security violation and logging the user out!  
I solved this in `api.ts` by introducing an `isRefreshing` boolean flag and sharing a single `refreshPromise`. The first 401 initiates the refresh, and any subsequent 401s attach to the existing promise, ensuring exactly one refresh request executes."

---

## 9. TECHNICAL DEBT & HOW I WOULD IMPROVE IT NEXT

"As an engineer, I believe in being completely honest about technical tradeoffs and known areas for improvement:

1. **In-Memory Matrix Recalculation:**  
   Currently, the recommendation engine queries the entire `user_ratings` table and builds the matrix in memory on every request. On our current dataset of 100 users and ~4,800 ratings, this is very fast—my `perf_test.py` script verified a P95 latency under 200 milliseconds. But if we scaled to 100,000 users and 10 million ratings, running `db.query(UserRating).all()` on every web request would crash the server with an out-of-memory error.  
   **How I would improve it:** I would offload matrix storage to an in-memory cache like **Redis** with a 1-hour expiration, or compute similarities asynchronously using a background worker with **Celery** or **Redis Queue (RQ)**.

2. **Upgrading to Model-Based Matrix Factorization or Vector Embeddings:**  
   User-User Collaborative Filtering struggles when the catalog scales to tens of thousands of items because matrix sparsity approaches 99%. If I had another month, I would implement **Matrix Factorization using Alternating Least Squares (ALS)** or **Singular Value Decomposition (SVD)**. Alternatively, I would generate text embeddings for anime synopses and themes using an embedding model, store them in a vector database like **pgvector**, and build a **Hybrid Recommender** that blends collaborative filtering with semantic content similarity.

3. **Code Discrepancies to Clean Up:**  
   In `seed_users.py`, dummy users were inserted without passing a `password_hash`, which I would patch to guarantee script re-runs against fresh schemas don't fail. Also, while my documentation mentioned a 5-rating cold-start threshold, the code currently activates collaborative filtering at $\ge 1$ rating; I would align the code to enforce a strict 5-rating minimum for higher prediction confidence."

---

## 10. CLOSING SUMMARY (THE FINAL 30-SECOND WRAP-UP)

"To wrap it up: AniRec represents an end-to-end full-stack engineering effort. It pairs a modern, reactive TypeScript and Next.js frontend with an asynchronous, strictly-validated FastAPI backend and a relational PostgreSQL database.

Beyond basic CRUD *(Create, Read, Update, Delete)*, it demonstrates a complete implementation of production security patterns with rotating JWTs, clean error handling, resilient connection pooling, and most importantly, a mathematically sound recommendation engine built from first principles in pure Python.

I would be more than happy to dive into any specific file, walk through any line of code, or explain the vector math in even greater detail."
