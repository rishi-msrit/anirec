"use client";

import Link from "next/link";
import { useState } from "react";
import { Anime, WatchlistStatus } from "@/types";
import { useAuth } from "@/lib/auth";
import { ratingsApi, watchlistApi } from "@/lib/api";

interface AnimeCardProps {
  anime: Anime;
  userRating?: number;
  watchlistStatus?: WatchlistStatus;
  onRatingChange?: (score: number) => void;
  onWatchlistChange?: (status: WatchlistStatus | null) => void;
}

const FALLBACK_IMAGE = "https://placehold.co/300x420/1a1a2e/9b59b6?text=No+Image";

export default function AnimeCard({
  anime,
  userRating,
  watchlistStatus,
  onRatingChange,
  onWatchlistChange,
}: AnimeCardProps) {
  const { user } = useAuth();
  const [hoverRating, setHoverRating] = useState(0);
  const [localRating, setLocalRating] = useState(userRating);
  const [localStatus, setLocalStatus] = useState(watchlistStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRate = async (score: number) => {
    if (!user || isUpdating) return;
    setIsUpdating(true);
    try {
      await ratingsApi.add(user.id, anime.id, score);
      setLocalRating(score);
      onRatingChange?.(score);
    } catch (e) {
      console.error("Rating failed:", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleWatchlist = async (status: WatchlistStatus) => {
    if (!user || isUpdating) return;
    setIsUpdating(true);
    try {
      if (localStatus === status) {
        await watchlistApi.remove(user.id, anime.id);
        setLocalStatus(undefined);
        onWatchlistChange?.(null);
      } else {
        await watchlistApi.add(user.id, anime.id, status);
        setLocalStatus(status);
        onWatchlistChange?.(status);
      }
    } catch (e) {
      console.error("Watchlist update failed:", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const statusColors: Record<WatchlistStatus, string> = {
    watching: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "plan-to-watch": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  const statusLabels: Record<WatchlistStatus, string> = {
    watching: "Watching",
    completed: "Completed",
    "plan-to-watch": "Plan to Watch",
  };

  const statusShortLabels: Record<WatchlistStatus, string> = {
    watching: "Watch",
    completed: "Done",
    "plan-to-watch": "Plan",
  };

  return (
    <div className="anime-card group relative bg-surface rounded-2xl overflow-hidden border border-white/5 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10">
      <Link href={`/anime/${anime.id}`} className="block relative">
        <div className="relative h-[280px] overflow-hidden">
          <img
            src={anime.image_url || FALLBACK_IMAGE}
            alt={anime.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {anime.average_rating && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-sm font-bold">
              <span className="text-yellow-400">★</span>
              <span className="text-white">{anime.average_rating.toFixed(1)}</span>
            </div>
          )}

          {localStatus && (
            <div className={`absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-lg border backdrop-blur-sm ${statusColors[localStatus]}`}>
              {statusLabels[localStatus]}
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/anime/${anime.id}`}>
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 hover:text-purple-400 transition-colors mb-2">
            {anime.title}
          </h3>
        </Link>

        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
          {anime.year && <span>{anime.year}</span>}
          {anime.episode_count && (
            <>
              <span>·</span>
              <span>{anime.episode_count} eps</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {(anime.genres || []).slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20"
            >
              {genre}
            </span>
          ))}
        </div>

        {user && (
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  disabled={isUpdating}
                  className={`text-sm transition-all duration-100 ${
                    star <= (hoverRating || localRating || 0)
                      ? "text-yellow-400 scale-110"
                      : "text-gray-600"
                  } hover:scale-125 disabled:cursor-not-allowed`}
                  title={`Rate ${star}/10`}
                >
                  ★
                </button>
              ))}
              {localRating && (
                <span className="text-xs text-gray-400 ml-1">{localRating}/10</span>
              )}
            </div>

            <div className="flex gap-1">
              {(["watching", "completed", "plan-to-watch"] as WatchlistStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => handleWatchlist(status)}
                    disabled={isUpdating}
                    className={`flex-1 text-xs py-1 rounded-lg border transition-all duration-200 ${
                      localStatus === status
                        ? statusColors[status]
                        : "border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300"
                    } disabled:cursor-not-allowed`}
                    title={statusLabels[status]}
                  >
                    {statusShortLabels[status]}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

