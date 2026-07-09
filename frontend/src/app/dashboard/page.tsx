"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserStats as UserStatsType, Rating } from "@/types";
import { userApi, ratingsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function StatCard({
  value,
  label,
  sub,
  color = "purple",
}: {
  value: string | number;
  label: string;
  sub?: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    purple: "from-purple-500/10 to-purple-600/5 border-purple-500/20",
    pink: "from-pink-500/10 to-pink-600/5 border-pink-500/20",
    blue: "from-blue-500/10 to-blue-600/5 border-blue-500/20",
    emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
    amber: "from-amber-500/10 to-amber-600/5 border-amber-500/20",
  };
  return (
    <div className={`stat-card bg-gradient-to-br ${colors[color] || colors.purple} border`}>
      <div>
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-sm font-semibold text-gray-300">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function DonutChart({ watching, completed, planToWatch }: {
  watching: number; completed: number; planToWatch: number;
}) {
  const total = watching + completed + planToWatch;
  if (total === 0) return null;

  const r = 54;
  const circumference = 2 * Math.PI * r;
  const segments = [
    { value: watching, color: "#3b82f6", label: "Watching" },
    { value: completed, color: "#10b981", label: "Completed" },
    { value: planToWatch, color: "#f59e0b", label: "Plan to Watch" },
  ];

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circumference;
    const gap = circumference - dash;
    const arc = { ...seg, dash, gap, offset };
    offset += dash;
    return arc;
  });

  return (
    <div className="flex items-center gap-8">
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" />
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth="16"
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={-arc.offset}
              transform="rotate(-90 70 70)"
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-black text-white">{total}</p>
            <p className="text-xs text-gray-400">total</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-sm text-gray-300">{seg.label}</span>
            <span className="text-sm font-bold text-white ml-auto pl-4">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStatsType | null>(null);
  const [recentRatings, setRecentRatings] = useState<Rating[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    Promise.all([
      userApi.getStats(),
      ratingsApi.list(),
    ])
      .then(([s, ratings]) => {
        setStats(s);
        setRecentRatings(ratings.slice(0, 8));
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="page-wrapper page-enter text-center py-32">
        <h1 className="text-3xl font-bold text-white mb-4">Your Dashboard</h1>
        <p className="text-gray-400 mb-8">Sign in to see your anime statistics</p>
        <button
          onClick={() => document.getElementById("login-btn")?.click()}
          className="btn-primary"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-wrapper page-enter">
        <div className="skeleton h-10 w-64 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper page-enter">
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">
            Welcome back, <span className="text-gradient">{user.username}</span>
          </h1>
          <p className="text-gray-400">Here is your anime journey at a glance</p>
        </div>
        <Link href="/recommendations" className="btn-primary hidden sm:block">
          Get Recommendations
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
          <StatCard value={stats.total_rated} label="Anime Rated" color="purple" />
          <StatCard
            value={stats.average_score?.toFixed(1) || "—"}
            label="Avg Rating"
            sub="out of 10"
            color="pink"
          />
          <StatCard value={stats.total_watchlist} label="In Watchlist" color="blue" />
          <StatCard
            value={stats.favorite_genre || "—"}
            label="Fav Genre"
            sub="based on high ratings"
            color="emerald"
          />
          <StatCard value={stats.completed_count} label="Completed" color="amber" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {stats && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-6">Watchlist Distribution</h2>
            {stats.total_watchlist === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No anime in watchlist yet</p>
                <Link href="/" className="text-purple-400 text-sm hover:text-purple-300 mt-2 inline-block">
                  Browse anime
                </Link>
              </div>
            ) : (
              <DonutChart
                watching={stats.watching_count}
                completed={stats.completed_count}
                planToWatch={stats.plan_to_watch_count}
              />
            )}
          </div>
        )}

        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-white mb-5">Recent Ratings</h2>
          {recentRatings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No ratings yet</p>
              <Link href="/" className="text-purple-400 text-sm hover:text-purple-300 mt-2 inline-block">
                Rate some anime
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRatings.map((rating) => (
                <Link
                  key={rating.id}
                  href={`/anime/${rating.anime_id}`}
                  className="flex items-center gap-3 hover:bg-white/5 rounded-xl p-2 -mx-2 transition-colors group"
                >
                  <img
                    src={rating.anime?.image_url || "https://placehold.co/40x56/1a1a2e/9b59b6?text=?"}
                    alt={rating.anime?.title}
                    className="w-8 h-12 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/40x56/1a1a2e/9b59b6?text=?"; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white line-clamp-1 group-hover:text-purple-400 transition-colors">
                      {rating.anime?.title || `Anime #${rating.anime_id}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(rating.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-yellow-400">★</span>
                    <span className="text-white font-bold text-sm">{rating.score}</span>
                    <span className="text-gray-500 text-xs">/10</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/", label: "Browse Anime", desc: "Discover new shows" },
          { href: "/watchlist", label: "My Watchlist", desc: "Manage your list" },
          { href: "/recommendations", label: "For You", desc: "AI-powered picks" },
        ].map(({ href, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="glass-card p-5 flex items-center gap-4 hover:border-purple-500/30 hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div>
              <p className="font-semibold text-white text-sm">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <span className="ml-auto text-gray-600 group-hover:text-purple-400 transition-colors">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

