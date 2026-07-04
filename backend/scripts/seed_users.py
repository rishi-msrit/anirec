import sys
import os
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models import Base, User, Anime, UserRating, Watchlist

RANDOM_SEED = 42
NUM_USERS = 100
MIN_RATINGS = 20
MAX_RATINGS = 80

SCORE_DISTRIBUTION = [
    (1, 2),
    (2, 3),
    (3, 4),
    (4, 6),
    (5, 8),
    (6, 14),
    (7, 22),
    (8, 20),
    (9, 14),
    (10, 7),
]
SCORES = [score for score, weight in SCORE_DISTRIBUTION for _ in range(weight)]


def generate_username(index: int) -> str:
    prefixes = [
        "otaku", "weeabo", "manga", "ninja", "samurai", "sakura", "mecha",
        "senpai", "kawaii", "yuki", "hiro", "rei", "asuka", "mikasa",
        "light", "ryuk", "goku", "naruto", "ichigo", "luffy", "ace",
        "zoro", "nami", "robin", "chopper", "sanji", "franky", "brook",
    ]
    suffixes = ["fan", "lover", "watch", "binge", "addict", "pro", "kun", "chan"]
    prefix = prefixes[index % len(prefixes)]
    suffix = suffixes[index % len(suffixes)]
    return f"{prefix}_{suffix}_{index + 1}"


def seed_users():
    random.seed(RANDOM_SEED)

    print("User Seeder - Synthetic Rating Generator")
    print("=" * 50)

    db = SessionLocal()

    try:
        anime_ids = [row[0] for row in db.query(Anime.id).all()]
        if not anime_ids:
            print("No anime found in DB. Run seed_animes.py first!")
            return

        anime_genres = {
            row[0]: row[1]
            for row in db.query(Anime.id, Anime.genres).all()
        }

        print(f"Available anime: {len(anime_ids)}")
        print(f"Generating {NUM_USERS} synthetic users\n")

        existing_user_count = db.query(User).filter(
            User.email.like("synthetic_%")
        ).count()
        if existing_user_count >= NUM_USERS:
            print(f"Already have {existing_user_count} synthetic users. Skipping.")
            return

        total_ratings_inserted = 0
        total_watchlist_inserted = 0

        for i in range(NUM_USERS):
            username = generate_username(i)
            email = f"synthetic_{i + 1}@anime.app"

            existing = db.query(User).filter(User.email == email).first()
            if existing:
                print(f"User {i+1}/{NUM_USERS} already exists, skipping")
                continue

            user = User(username=username, email=email)
            db.add(user)
            db.flush()

            all_genres = [
                "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Sci-Fi",
                "Romance", "Thriller", "Horror", "Slice of Life", "Sports", "Mecha"
            ]
            favorite_genres = random.sample(all_genres, k=random.randint(1, 3))

            num_ratings = random.randint(MIN_RATINGS, MAX_RATINGS)

            preferred_anime = [
                aid for aid in anime_ids
                if any(
                    g in (anime_genres.get(aid) or [])
                    for g in favorite_genres
                )
            ]
            other_anime = [aid for aid in anime_ids if aid not in set(preferred_anime)]

            preferred_count = int(num_ratings * 0.6)
            other_count = num_ratings - preferred_count

            selected_preferred = random.sample(
                preferred_anime, k=min(preferred_count, len(preferred_anime))
            )
            selected_other = random.sample(
                other_anime, k=min(other_count, len(other_anime))
            )

            selected_anime = list(set(selected_preferred + selected_other))
            random.shuffle(selected_anime)
            selected_anime = selected_anime[:num_ratings]

            user_ratings_added = 0
            for anime_id in selected_anime:
                if any(
                    g in (anime_genres.get(anime_id) or [])
                    for g in favorite_genres
                ):
                    score = random.choice(SCORES + [7, 8, 8, 9])
                    score = min(10, max(1, score))
                else:
                    score = random.choice(SCORES)

                rating = UserRating(
                    user_id=user.id,
                    anime_id=anime_id,
                    score=score,
                )
                db.add(rating)
                user_ratings_added += 1

            watchlist_statuses = ["watching", "completed", "plan-to-watch"]
            watchlist_anime = random.sample(
                [aid for aid in anime_ids if aid not in selected_anime],
                k=min(10, len(anime_ids) - len(selected_anime))
            )
            watchlist_added = 0
            for anime_id in watchlist_anime:
                status = random.choice(watchlist_statuses)
                entry = Watchlist(
                    user_id=user.id,
                    anime_id=anime_id,
                    status=status,
                )
                db.add(entry)
                watchlist_added += 1

            db.commit()
            total_ratings_inserted += user_ratings_added
            total_watchlist_inserted += watchlist_added

            if (i + 1) % 10 == 0:
                print(f"Created {i+1}/{NUM_USERS} users ({total_ratings_inserted} ratings so far)")

        print(f"\n{'='*50}")
        print("User seeding complete!")
        print(f"   Users created: {NUM_USERS}")
        print(f"   Total ratings: {total_ratings_inserted}")
        print(f"   Total watchlist entries: {total_watchlist_inserted}")
        print(f"   Avg ratings per user: {total_ratings_inserted // NUM_USERS}")

    except Exception as e:
        db.rollback()
        print(f"\nSeeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()



if __name__ == "__main__":
    seed_users()
