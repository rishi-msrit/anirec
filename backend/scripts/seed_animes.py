import sys
import os
import time
import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models import Base, Anime

JIKAN_BASE = "https://api.jikan.moe/v4"
RATE_LIMIT_DELAY = 0.4
TOTAL_ANIME = 500
PAGE_SIZE = 25


def fetch_top_anime(page: int) -> list[dict]:
    url = f"{JIKAN_BASE}/top/anime?limit={PAGE_SIZE}&page={page}"
    try:
        response = httpx.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data.get("data", [])
    except httpx.HTTPStatusError as e:
        print(f"HTTP error on page {page}: {e.response.status_code}")
        return []
    except Exception as e:
        print(f"Error on page {page}: {e}")
        return []


def parse_anime(item: dict) -> dict | None:
    try:
        genres = [g["name"] for g in item.get("genres", [])]
        genres += [g["name"] for g in item.get("themes", [])]
        genres = list(set(genres))[:10]

        year = item.get("year")
        if not year:
            aired = item.get("aired", {}) or {}
            prop = aired.get("prop", {}) or {}
            from_prop = prop.get("from", {}) or {}
            year = from_prop.get("year")

        image_url = None
        images = item.get("images", {})
        if images:
            jpg = images.get("jpg", {}) or {}
            image_url = jpg.get("large_image_url") or jpg.get("image_url")

        return {
            "external_id": item["mal_id"],
            "title": item.get("title_english") or item.get("title", "Unknown"),
            "synopsis": item.get("synopsis"),
            "genres": genres,
            "average_rating": item.get("score"),
            "episode_count": item.get("episodes"),
            "year": year,
            "image_url": image_url,
        }
    except (KeyError, TypeError) as e:
        print(f"Parse error for {item.get('mal_id', '?')}: {e}")
        return None


def seed_animes():
    print("Anime Seeder - Jikan API")
    print("=" * 50)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing_count = db.query(Anime).count()
        if existing_count >= TOTAL_ANIME:
            print(f"Already seeded {existing_count} anime. Skipping.")
            return

        existing_ids = {
            row[0] for row in db.query(Anime.external_id).all()
        }
        print(f"Existing anime in DB: {existing_count}")
        print(f"Target: {TOTAL_ANIME} anime\n")

        total_pages = (TOTAL_ANIME + PAGE_SIZE - 1) // PAGE_SIZE
        inserted = 0
        skipped = 0

        for page in range(1, total_pages + 1):
            print(f"Fetching page {page}/{total_pages}...", end=" ", flush=True)
            items = fetch_top_anime(page)

            if not items:
                print("Empty response, skipping")
                continue

            page_inserted = 0
            for item in items:
                parsed = parse_anime(item)
                if not parsed:
                    continue

                if parsed["external_id"] in existing_ids:
                    skipped += 1
                    continue

                anime = Anime(**parsed)
                db.add(anime)
                existing_ids.add(parsed["external_id"])
                inserted += 1
                page_inserted += 1

            db.commit()
            print(f"Inserted {page_inserted} anime (total: {inserted})")

            if page < total_pages:
                time.sleep(RATE_LIMIT_DELAY)

        print(f"\n{'='*50}")
        print("Seeding complete!")
        print(f"   Inserted: {inserted}")
        print(f"   Skipped: {skipped}")
        print(f"   Total anime in DB: {db.query(Anime).count()}")

    except Exception as e:
        db.rollback()
        print(f"\nSeeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_animes()

