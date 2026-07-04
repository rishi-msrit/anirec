"""
Performance test for the recommendation endpoint.
Simulates load and measures response time.

Usage:
    cd backend
    python scripts/perf_test.py
"""

import sys
import os
import time
import random
import statistics

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User
from app.algorithms.collaborative import get_recommendations


def run_perf_test(num_runs: int = 10):
    """Run the CF algorithm N times and report timing."""
    print("⚡ Performance Test — Recommendation Engine")
    print("=" * 50)

    db = SessionLocal()
    try:
        # Get some real user IDs that have ratings
        users = db.query(User).limit(50).all()
        if not users:
            print("❌ No users found. Run seed_users.py first.")
            return

        user_ids = [u.id for u in users]
        times = []

        for run in range(num_runs):
            user_id = random.choice(user_ids)
            start = time.perf_counter()
            recs = get_recommendations(user_id=user_id, db=db, top_n=10)
            elapsed_ms = (time.perf_counter() - start) * 1000
            times.append(elapsed_ms)
            status = "✅" if elapsed_ms < 500 else "⚠️ "
            print(f"  {status} Run {run+1:2d}: user_id={user_id:4d} → {len(recs)} recs in {elapsed_ms:.1f}ms")

        print(f"\n{'='*50}")
        print(f"📊 Statistics ({num_runs} runs):")
        print(f"   Min:    {min(times):.1f}ms")
        print(f"   Max:    {max(times):.1f}ms")
        print(f"   Mean:   {statistics.mean(times):.1f}ms")
        print(f"   Median: {statistics.median(times):.1f}ms")
        print(f"   P95:    {sorted(times)[int(num_runs * 0.95)]:.1f}ms")

        target_ms = 500
        passed = sum(1 for t in times if t < target_ms)
        print(f"\n   {'✅' if passed == num_runs else '⚠️ '} {passed}/{num_runs} runs under {target_ms}ms target")

    finally:
        db.close()


if __name__ == "__main__":
    run_perf_test(num_runs=20)
