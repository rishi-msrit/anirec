"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WatchlistEntry, WatchlistStatus } from "@/types";
import { watchlistApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const TABS: { key: WatchlistStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "watching", label: "Watching" },
  { key: "completed", label: "Completed" },
  { key: "plan-to-watch", label: "Plan to Watch" },
];

const STATUS_COLORS: Record<WatchlistStatus, string> = {
  watching: "badge-watching",
  completed: "badge-completed",
  "plan-to-watch": "badge-plan",
};
const STATUS_LABELS: Record<WatchlistStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  "plan-to-watch": "Plan to Watch",
};

export default function WatchlistPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WatchlistStatus | "all">("all");
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    watchlistApi
      .list(user.id)
      .then(setEntries)
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleRemove = async (animeId: number) => {
    if (!user || isUpdating) return;
    setIsUpdating(animeId);
    try {
      await watchlistApi.remove(user.id, animeId);
      setEntries((prev) => prev.filter((e) => e.anime_id !== animeId));
    } finally {
      setIsUpdating(null);
    }
  };

  const handleStatusChange = async (animeId: number, status: WatchlistStatus) => {
    if (!user || isUpdating) return;
    setIsUpdating(animeId);
    try {
      await watchlistApi.updateStatus(user.id, animeId, status);
      setEntries((prev) =>
        prev.map((e) => (e.anime_id === animeId ? { ...e, status } : e))
      );
    } finally {
      setIsUpdating(null);
    }
  };

  const filtered = activeTab === "all" ? entries : entries.filter((e) => e.status === activeTab);
  const counts = {
    all: entries.length,
    watching: entries.filter((e) => e.status === "watching").length,
    completed: entries.filter((e) => e.status === "completed").length,
    "plan-to-watch": entries.filter((e) => e.status === "plan-to-watch").length,
  };

  if (!user) {
    return (
      <div className="page-wrapper page-enter text-center py-32">
        <h1 className="text-3xl font-bold text-white mb-4">Your Watchlist</h1>
        <p className="text-gray-400 mb-8">Sign in to track your anime journey</p>
        <button
          onClick={() => document.getElementById("login-btn")?.click()}
          className="btn-primary"
        >
          Sign In to Start
        </button>
      </div>
    );
  }

  return (
    <div className="page-wrapper page-enter">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-white mb-2">
          My <span className="text-gradient">Watchlist</span>
        </h1>
        <p className="text-gray-400">{entries.length} anime in your collection</p>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            id={`tab-${key}`}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === key
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "bg-white/5 text-gray-400 border border-white/5 hover:text-white"
            }`}
          >
            <span>{label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === key ? "bg-purple-500/30 text-purple-300" : "bg-white/10 text-gray-500"
            }`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card p-4 flex gap-4">
              <div className="skeleton w-16 h-22 rounded-xl flex-shrink-0" style={{ height: 88 }} />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-5 w-2/3" />
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <h3 className="text-lg font-semibold text-white mb-2">
            {activeTab === "all" ? "Your watchlist is empty" : `No ${activeTab} anime`}
          </h3>
          <p className="text-gray-400 mb-6">
            {activeTab === "all"
              ? "Start adding anime from the browse page"
              : `No anime marked as "${STATUS_LABELS[activeTab as WatchlistStatus]}"`}
          </p>
          <Link href="/" className="btn-primary inline-block">
            Browse Anime
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="glass-card p-4 flex items-center gap-4 hover:border-purple-500/20 transition-all duration-200 group"
            >
              <Link href={`/anime/${entry.anime_id}`} className="flex-shrink-0">
                <img
                  src={entry.anime?.image_url || "https://placehold.co/64x90/1a1a2e/9b59b6?text=?"}
                  alt={entry.anime?.title}
                  className="w-14 h-20 object-cover rounded-xl"
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/64x90/1a1a2e/9b59b6?text=?"; }}
                />
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/anime/${entry.anime_id}`}>
                  <h3 className="font-semibold text-white text-sm line-clamp-1 hover:text-purple-400 transition-colors mb-1">
                    {entry.anime?.title}
                  </h3>
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-2">
                  {entry.anime?.year && <span>{entry.anime.year}</span>}
                  {entry.anime?.episode_count && <span>· {entry.anime.episode_count} eps</span>}
                  {entry.anime?.average_rating && (
                    <span className="text-yellow-400">★ {entry.anime.average_rating.toFixed(1)}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(entry.anime?.genres || []).slice(0, 3).map((g) => (
                    <span key={g} className="genre-pill">{g}</span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={entry.status}
                  onChange={(e) => handleStatusChange(entry.anime_id, e.target.value as WatchlistStatus)}
                  disabled={isUpdating === entry.anime_id}
                  className={`text-xs px-2 py-1.5 rounded-lg border bg-transparent cursor-pointer appearance-none text-center disabled:cursor-not-allowed ${STATUS_COLORS[entry.status]}`}
                  id={`status-select-${entry.anime_id}`}
                >
                  <option value="watching">Watching</option>
                  <option value="completed">Completed</option>
                  <option value="plan-to-watch">Plan to Watch</option>
                </select>

                <button
                  onClick={() => handleRemove(entry.anime_id)}
                  disabled={isUpdating === entry.anime_id}
                  className="opacity-0 group-hover:opacity-100 px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all rounded-lg hover:bg-red-500/10 disabled:cursor-not-allowed"
                  title="Remove from watchlist"
                  id={`remove-${entry.anime_id}`}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

