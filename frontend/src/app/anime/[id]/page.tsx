"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Anime, Rating, WatchlistEntry, WatchlistStatus } from "@/types";
import { animeApi, ratingsApi, watchlistApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const FALLBACK_IMAGE = "https://placehold.co/400x600/1a1a2e/9b59b6?text=No+Image";

const STATUS_CONFIG: Record<WatchlistStatus, { label: string; color: string }> = {
  watching: { label: "Watching", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  completed: { label: "Completed", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  "plan-to-watch": { label: "Plan to Watch", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
};

function DetailSkeleton() {
  return (
    <div className="page-wrapper animate-pulse">
      <div className="flex gap-10">
        <div className="skeleton w-64 h-96 flex-shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-4">
          <div className="skeleton h-10 w-3/4" />
          <div className="skeleton h-4 w-32" />
          <div className="flex gap-2">
            {[1,2,3].map(i => <div key={i} className="skeleton h-6 w-16 rounded-full" />)}
          </div>
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function AnimeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [watchlistStatus, setWatchlistStatus] = useState<WatchlistStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);

  useEffect(() => {
    animeApi
      .get(Number(id))
      .then(setAnime)
      .catch(() => router.push("/"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!user || !anime) return;
    Promise.all([
      ratingsApi.list(user.id),
      watchlistApi.list(user.id),
    ]).then(([ratings, watchlist]) => {
      const myRating = ratings.find((r: Rating) => r.anime_id === anime.id);
      const myEntry = watchlist.find((w: WatchlistEntry) => w.anime_id === anime.id);
      if (myRating) setUserRating(myRating.score);
      if (myEntry) setWatchlistStatus(myEntry.status);
    });
  }, [user, anime]);

  const handleRate = async (score: number) => {
    if (!user || isUpdating) return;
    setIsUpdating(true);
    try {
      await ratingsApi.add(user.id, anime!.id, score);
      setUserRating(score);
      setRatingSuccess(true);
      setTimeout(() => setRatingSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleWatchlist = async (status: WatchlistStatus) => {
    if (!user || isUpdating) return;
    setIsUpdating(true);
    try {
      if (watchlistStatus === status) {
        await watchlistApi.remove(user.id, anime!.id);
        setWatchlistStatus(null);
      } else {
        await watchlistApi.add(user.id, anime!.id, status);
        setWatchlistStatus(status);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <DetailSkeleton />;
  if (!anime) return null;

  const displayRating = hoverRating || userRating;

  return (
    <div className="page-wrapper page-enter">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
      >
        <span className="group-hover:-translate-x-1 transition-transform">←</span>
        Back to Browse
      </Link>

      <div className="flex flex-col md:flex-row gap-10">
        <div className="flex-shrink-0">
          <div className="relative w-full md:w-64 rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/10">
            <img
              src={anime.image_url || FALLBACK_IMAGE}
              alt={anime.title}
              className="w-full h-auto object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
            />
          </div>
        </div>

        <div className="flex-1">
          <h1 className="text-4xl font-black text-white mb-2 leading-tight">
            {anime.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-6">
            {anime.year && (
              <span className="flex items-center gap-1">
                Year: {anime.year}
              </span>
            )}
            {anime.episode_count && (
              <span className="flex items-center gap-1">
                Episodes: {anime.episode_count}
              </span>
            )}
            {anime.average_rating && (
              <span className="flex items-center gap-2 text-yellow-400 font-semibold text-base">
                ★ {anime.average_rating.toFixed(2)}
                <span className="text-gray-500 text-sm font-normal">/ 10</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {(anime.genres || []).map((genre) => (
              <span key={genre} className="genre-pill">{genre}</span>
            ))}
          </div>

          {anime.synopsis && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-3">Synopsis</h2>
              <p className="text-gray-400 leading-relaxed text-sm">
                {anime.synopsis.length > 500
                  ? anime.synopsis.slice(0, 500) + "..."
                  : anime.synopsis}
              </p>
            </div>
          )}

          {user ? (
            <div className="glass-card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-white">Your Rating & Watchlist</h2>

              <div>
                <p className="text-sm text-gray-400 mb-3">
                  Rate this anime (1–10){" "}
                  {displayRating > 0 && (
                    <span className="text-yellow-400 font-bold">{displayRating}/10</span>
                  )}
                </p>
                <div className="flex gap-1.5">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
                    <button
                      key={score}
                      id={`rate-${score}`}
                      onClick={() => handleRate(score)}
                      onMouseEnter={() => setHoverRating(score)}
                      onMouseLeave={() => setHoverRating(0)}
                      disabled={isUpdating}
                      className={`w-9 h-9 rounded-lg text-sm font-bold transition-all duration-100 ${
                        score <= displayRating
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 scale-105"
                          : "bg-white/5 text-gray-600 border border-white/5 hover:border-yellow-500/30"
                      } disabled:cursor-not-allowed`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                {ratingSuccess && (
                  <p className="text-emerald-400 text-sm mt-2 animate-fade-in">
                    Rating saved!
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-3">Add to watchlist</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(STATUS_CONFIG) as [WatchlistStatus, typeof STATUS_CONFIG[WatchlistStatus]][]).map(
                    ([status, config]) => (
                      <button
                        key={status}
                        id={`watchlist-${status}`}
                        onClick={() => handleWatchlist(status)}
                        disabled={isUpdating}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                          watchlistStatus === status
                            ? config.color
                            : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-white"
                        } disabled:cursor-not-allowed`}
                      >
                        {config.label}
                      </button>
                    )
                  )}
                  {watchlistStatus && (
                    <button
                      onClick={() => {
                        watchlistApi.remove(user.id, anime.id).then(() => setWatchlistStatus(null));
                      }}
                      className="px-4 py-2.5 rounded-xl border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10 transition-all"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-6 text-center">
              <p className="text-gray-400 mb-4">Sign in to rate this anime and track your watchlist</p>
              <button
                id="signin-prompt"
                onClick={() => document.getElementById("login-btn")?.click()}
                className="btn-primary"
              >
                Sign In to Rate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

