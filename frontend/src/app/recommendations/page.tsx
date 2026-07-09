"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RecommendationItem } from "@/types";
import { recommendApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function RecommendCardSkeleton() {
  return (
    <div className="glass-card p-5 flex gap-4">
      <div className="skeleton w-16 h-24 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-3 w-2/3" />
        <div className="skeleton h-8 w-28 rounded-full" />
      </div>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "#10b981" : score >= 6 ? "#a855f7" : "#f59e0b";
  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
        />
      </div>
      <span className="text-xs font-bold" style={{ color }}>
        {score.toFixed(1)}/10
      </span>
    </div>
  );
}

export default function RecommendationsPage() {
  const { user } = useAuth();
  const [recs, setRecs] = useState<RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [algorithm, setAlgorithm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    recommendApi
      .get()
      .then((res) => {
        setRecs(res.recommendations);
        setAlgorithm(res.algorithm);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="page-wrapper page-enter text-center py-32">
        <h1 className="text-3xl font-bold text-white mb-4">Personalized Recommendations</h1>
        <p className="text-gray-400 mb-8">
          Sign in and rate some anime to get personalized recommendations powered by collaborative filtering
        </p>
        <button
          onClick={() => document.getElementById("login-btn")?.click()}
          className="btn-primary"
        >
          Get Started
        </button>
      </div>
    );
  }

  return (
    <div className="page-wrapper page-enter">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-black text-white">
            Recommended <span className="text-gradient">For You</span>
          </h1>
        </div>
        <p className="text-gray-400 max-w-2xl">
          Top 10 anime picks based on users with similar taste, ranked by predicted score.
        </p>

        {algorithm && (
          <div className="mt-4 inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2 text-xs text-purple-300">
            <span>{algorithm}</span>
          </div>
        )}
      </div>

      {!isLoading && recs.length > 0 && recs[0].similar_users_count === 0 && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-300 flex items-start gap-3">
          <span>
            You are seeing community top picks right now. Rate 5 or more anime to unlock
            personalized collaborative filtering recommendations.{" "}
            <Link href="/" className="underline hover:text-amber-200">Browse and rate anime</Link>
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 mb-6">
          Failed to load recommendations: {error}
        </div>
      )}

      <div className="space-y-4">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => <RecommendCardSkeleton key={i} />)
          : recs.map((rec, idx) => (
              <div
                key={rec.anime.id}
                className="rec-card flex gap-5 animate-slide-up group"
                style={{ animationDelay: `${idx * 60}ms` }}
                id={`rec-${rec.anime.id}`}
              >
                <div className="flex-shrink-0 w-16 text-center flex items-center justify-center">
                  <span className={`text-sm font-black ${
                    idx === 0 ? "text-yellow-400" : idx === 1 ? "text-gray-300" : idx === 2 ? "text-amber-600" : "text-gray-500"
                  }`}>
                    Rank {idx + 1}
                  </span>
                </div>

                <Link href={`/anime/${rec.anime.id}`} className="flex-shrink-0">
                  <img
                    src={rec.anime.image_url || "https://placehold.co/64x90/1a1a2e/9b59b6?text=?"}
                    alt={rec.anime.title}
                    className="w-14 h-20 object-cover rounded-xl group-hover:opacity-90 transition-opacity"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/64x90/1a1a2e/9b59b6?text=?"; }}
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link href={`/anime/${rec.anime.id}`}>
                    <h3 className="font-bold text-white hover:text-purple-400 transition-colors line-clamp-1 mb-1">
                      {rec.anime.title}
                    </h3>
                  </Link>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-2">
                    {rec.anime.year && <span>{rec.anime.year}</span>}
                    {rec.anime.episode_count && <span>· {rec.anime.episode_count} eps</span>}
                    {rec.anime.average_rating && (
                      <span className="text-yellow-400">
                        ★ {rec.anime.average_rating.toFixed(1)} MAL
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {(rec.anime.genres || []).slice(0, 4).map((g) => (
                      <span key={g} className="genre-pill">{g}</span>
                    ))}
                  </div>

                  <ScoreBar score={rec.predicted_score} />
                </div>

                <div className="hidden sm:flex flex-col items-end justify-center gap-2 flex-shrink-0 max-w-xs text-right">
                  <div className="text-xs text-gray-500 italic leading-relaxed">
                    &ldquo;{rec.reason}&rdquo;
                  </div>
                  {rec.similar_users_count > 0 && (
                    <div className="text-xs bg-purple-500/10 border border-purple-500/20 rounded-lg px-2 py-1 text-purple-400">
                      {rec.similar_users_count} similar users
                    </div>
                  )}
                </div>
              </div>
            ))}
      </div>

      {!isLoading && recs.length === 0 && !error && (
        <div className="text-center py-20 glass-card">
          <h3 className="text-xl font-semibold text-white mb-2">No recommendations yet</h3>
          <p className="text-gray-400 mb-6">Rate some anime to get personalized picks</p>
          <Link href="/" className="btn-primary inline-block">Browse & Rate Anime</Link>
        </div>
      )}
    </div>
  );
}

