import sys
import os
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User, Anime, UserRating, Watchlist

RANDOM_SEED = 42
NUM_USERS = 100
MIN_RATINGS = 25
MAX_RATINGS = 60

# Realistic score distribution skewed toward positive (like real MAL users)
SCORE_DISTRIBUTION = [
    (1, 1), (2, 2), (3, 3), (4, 5),
    (5, 8), (6, 14), (7, 22), (8, 20), (9, 14), (10, 7),
]
SCORES = [score for score, weight in SCORE_DISTRIBUTION for _ in range(weight)]

# 8 distinct taste archetypes — makes CF actually produce different results
# based on what the real user rates
TASTE_ARCHETYPES = [
    {
        "name": "action_junkie",
        "loves": ["Action", "Adventure", "Martial Arts", "Super Power"],
        "likes": ["Fantasy", "Sci-Fi", "Military"],
        "dislikes": ["Romance", "Slice of Life", "Shoujo"],
        "weight": 0.15,
    },
    {
        "name": "romance_fan",
        "loves": ["Romance", "Shoujo", "Drama"],
        "likes": ["Slice of Life", "Comedy", "School"],
        "dislikes": ["Action", "Mecha", "Horror"],
        "weight": 0.15,
    },
    {
        "name": "scifi_mecha",
        "loves": ["Sci-Fi", "Mecha", "Space", "Military"],
        "likes": ["Action", "Adventure", "Thriller"],
        "dislikes": ["Romance", "Slice of Life", "Shoujo"],
        "weight": 0.12,
    },
    {
        "name": "thriller_mystery",
        "loves": ["Thriller", "Mystery", "Psychological", "Horror"],
        "likes": ["Drama", "Supernatural"],
        "dislikes": ["Comedy", "Slice of Life", "Sports"],
        "weight": 0.12,
    },
    {
        "name": "slice_of_life",
        "loves": ["Slice of Life", "Comedy", "School", "Music"],
        "likes": ["Romance", "Drama", "Sports"],
        "dislikes": ["Action", "Mecha", "Horror", "Sci-Fi"],
        "weight": 0.12,
    },
    {
        "name": "fantasy_adventure",
        "loves": ["Fantasy", "Adventure", "Magic", "Isekai"],
        "likes": ["Action", "Supernatural", "Romance"],
        "dislikes": ["Mecha", "Sports", "Slice of Life"],
        "weight": 0.12,
    },
    {
        "name": "sports_fan",
        "loves": ["Sports"],
        "likes": ["Comedy", "Slice of Life", "School"],
        "dislikes": ["Mecha", "Sci-Fi", "Horror"],
        "weight": 0.11,
    },
    {
        "name": "eclectic",  # Rates everything — helps bridge clusters
        "loves": [],
        "likes": ["Action", "Romance", "Comedy", "Fantasy", "Thriller"],
        "dislikes": [],
        "weight": 0.11,
    },
]

# Normalise weights
_total = sum(a["weight"] for a in TASTE_ARCHETYPES)
for a in TASTE_ARCHETYPES:
    a["weight"] = a["weight"] / _total


def pick_archetype(rng: random.Random) -> dict:
    r = rng.random()
    cumulative = 0.0
    for archetype in TASTE_ARCHETYPES:
        cumulative += archetype["weight"]
        if r <= cumulative:
            return archetype
    return TASTE_ARCHETYPES[-1]


def score_for_anime(anime_genres: list[str], archetype: dict, rng: random.Random) -> int:
    """
    Give a score that strongly reflects the archetype's preferences.
    This is what makes Pearson CF actually find meaningful neighbors.
    """
    genres = set(anime_genres or [])

    loves_match = bool(genres & set(archetype["loves"]))
    likes_match = bool(genres & set(archetype["likes"]))
    dislikes_match = bool(genres & set(archetype["dislikes"]))

    if loves_match and not dislikes_match:
        # Strongly positive: 7–10, biased toward 8–9
        base = rng.choices([7, 8, 9, 10], weights=[10, 35, 35, 20])[0]
    elif likes_match and not dislikes_match:
        # Mildly positive: 6–8
        base = rng.choices([6, 7, 8], weights=[25, 50, 25])[0]
    elif dislikes_match and not loves_match:
        # Negative: 1–5
        base = rng.choices([1, 2, 3, 4, 5], weights=[5, 10, 25, 35, 25])[0]
    else:
        # Neutral: pick from realistic distribution
        base = rng.choice(SCORES)

    return max(1, min(10, base))


def get_dummy_password_hash() -> str:
    import bcrypt
    return bcrypt.hashpw(b"synthetic_password_123", bcrypt.gensalt()).decode("utf-8")


def generate_username(index: int, archetype_name: str) -> str:
    suffixes = ["fan", "watcher", "binge", "addict", "kun", "chan", "pro", "x"]
    return f"{archetype_name}_{suffixes[index % len(suffixes)]}_{index + 1}"


def seed_users():
    rng = random.Random(RANDOM_SEED)

    print("User Seeder - Archetype-Based Synthetic Rating Generator")
    print("=" * 60)

    dummy_hash = get_dummy_password_hash()
    print("Generated dummy password hash\n")

    db = SessionLocal()

    try:
        anime_rows = db.query(Anime.id, Anime.genres).all()
        if not anime_rows:
            print("No anime found. Run seed_animes.py first!")
            return

        anime_ids = [r[0] for r in anime_rows]
        anime_genres_map = {r[0]: (r[1] or []) for r in anime_rows}
        print(f"Anime in DB: {len(anime_ids)}")

        existing = db.query(User).filter(User.email.like("synthetic_%")).count()
        if existing >= NUM_USERS:
            print(f"Already have {existing} synthetic users. Skipping.")
            return

        total_ratings = 0

        for i in range(NUM_USERS):
            email = f"synthetic_{i + 1}@anime.app"
            if db.query(User).filter(User.email == email).first():
                continue

            archetype = pick_archetype(rng)
            username = generate_username(i, archetype["name"])

            user = User(username=username, email=email, password_hash=dummy_hash)
            db.add(user)
            db.flush()

            # Decide how many anime to rate
            num_ratings = rng.randint(MIN_RATINGS, MAX_RATINGS)

            # Strongly prefer anime matching archetype loves (60%), then likes (25%), rest random
            loves_ids = [
                aid for aid in anime_ids
                if set(anime_genres_map[aid]) & set(archetype["loves"])
            ]
            likes_ids = [
                aid for aid in anime_ids
                if aid not in loves_ids
                and set(anime_genres_map[aid]) & set(archetype["likes"])
            ]
            other_ids = [
                aid for aid in anime_ids
                if aid not in loves_ids and aid not in likes_ids
            ]

            n_loves = min(int(num_ratings * 0.50), len(loves_ids))
            n_likes = min(int(num_ratings * 0.30), len(likes_ids))
            n_other = min(num_ratings - n_loves - n_likes, len(other_ids))

            selected = (
                rng.sample(loves_ids, n_loves)
                + rng.sample(likes_ids, n_likes)
                + rng.sample(other_ids, n_other)
            )
            rng.shuffle(selected)

            for anime_id in selected:
                genres = anime_genres_map[anime_id]
                sc = score_for_anime(genres, archetype, rng)
                db.add(UserRating(user_id=user.id, anime_id=anime_id, score=sc))

            total_ratings += len(selected)
            db.commit()

            if (i + 1) % 20 == 0:
                print(f"  {i+1}/{NUM_USERS} users created ({total_ratings} ratings so far)")

        print(f"\n{'='*60}")
        print(f"Done! {NUM_USERS} users, {total_ratings} ratings")
        print(f"Avg ratings/user: {total_ratings // NUM_USERS}")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
