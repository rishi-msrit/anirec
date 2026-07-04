"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimePaginated, AnimeFilters, Rating, WatchlistEntry, WatchlistStatus } from "@/types";

import { animeApi, ratingsApi, watchlistApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import AnimeCard from "@/components/AnimeCard";
import SearchSidebar from "@/components/SearchSidebar";

function AnimeCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl overflow-hidden border border-white/5">
      <div className="skeleton h-[280px] w-full" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/3" />
        <div className="flex gap-1">
          <div className="skeleton h-5 w-14 rounded-full" />
          <div className="skeleton h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnimePaginated | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<AnimeFilters>({ sort: "rating", page: 1 });
  const [userRatings, setUserRatings] = useState<Record<number, number>>({});
  const [userWatchlist, setUserWatchlist] = useState<Record<number, string>>({});

  const loadAnime = useCallback(async (f: AnimeFilters) => {
    setIsLoading(true);
    try {
      const result = await animeApi.list(f);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      ratingsApi.list(user.id),
      watchlistApi.list(user.id),
    ])
      .then(([ratings, watchlist]) => {
        setUserRatings(
          Object.fromEntries(ratings.map((r: Rating) => [r.anime_id, r.score]))
        );
        setUserWatchlist(
          Object.fromEntries(watchlist.map((w: WatchlistEntry) => [w.anime_id, w.status]))
        );
      })
      .catch(console.error);
  }, [user]);

  useEffect(() => {
    loadAnime(filters);
  }, [filters, loadAnime]);

  const handleFiltersChange = (newFilters: AnimeFilters) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setFilters((f) => ({ ...f, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="page-wrapper page-enter">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-black mb-4">
          <span className="text-gradient">Discover Anime</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Browse {data?.total?.toLocaleString() || "hundreds of"} anime titles. Rate what you have watched to unlock{" "}
          <span className="text-purple-400 font-semibold">personalized recommendations</span>.
        </p>
      </div>

      <div className="flex gap-8">
        <div className="hidden lg:block sticky top-24 h-fit">
          <SearchSidebar filters={filters} onFiltersChange={handleFiltersChange} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="lg:hidden mb-6">
            <SearchSidebar filters={filters} onFiltersChange={handleFiltersChange} />
          </div>

          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-400 text-sm">
              {isLoading ? (
                <span className="skeleton inline-block w-32 h-4" />
              ) : (
                <>
                  <span className="text-white font-semibold">{data?.total?.toLocaleString()}</span> anime found
                  {filters.genre && (
                    <span className="ml-1">
                      in <span className="text-purple-400">{filters.genre}</span>
                    </span>
                  )}
                </>
              )}
            </p>
            {data && data.pages > 1 && (
              <span className="text-sm text-gray-500">
                Page {filters.page} of {data.pages}
              </span>
            )}
          </div>

          <div className="anime-grid">
            {isLoading
              ? Array.from({ length: 20 }).map((_, i) => (
                  <AnimeCardSkeleton key={i} />
                ))
              : data?.items.map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    userRating={userRatings[anime.id]}
                    watchlistStatus={userWatchlist[anime.id] as WatchlistStatus}
                    onRatingChange={(score) =>
                      setUserRatings((prev) => ({ ...prev, [anime.id]: score }))
                    }
                    onWatchlistChange={(status) =>
                      setUserWatchlist((prev) => {
                        if (!status) {
                          const next = { ...prev };
                          delete next[anime.id];
                          return next;
                        }
                        return { ...prev, [anime.id]: status };
                      })
                    }
                  />
                ))}
          </div>

          {!isLoading && data?.items.length === 0 && (
            <div className="text-center py-20">
              <h3 className="text-xl font-semibold text-white mb-2">No anime found</h3>
              <p className="text-gray-400">Try adjusting your search or filters</p>
            </div>
          )}

          {data && data.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                id="prev-page"
                onClick={() => handlePageChange((filters.page || 1) - 1)}
                disabled={!filters.page || filters.page <= 1}
                className="btn-ghost disabled:opacity-30"
              >
                Prev
              </button>

              <div className="flex gap-1">
                {Array.from({ length: Math.min(data.pages, 7) }, (_, i) => {
                  const page = i + 1;
                  const isActive = page === filters.page;
                  return (
                    <button
                      key={page}
                      id={`page-${page}`}
                      onClick={() => handlePageChange(page)}
                      className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-purple-600 text-white"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                {data.pages > 7 && <span className="text-gray-500 self-center px-2">...</span>}
              </div>

              <button
                id="next-page"
                onClick={() => handlePageChange((filters.page || 1) + 1)}
                disabled={(filters.page || 1) >= data.pages}
                className="btn-ghost disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

