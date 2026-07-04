"use client";

import { useState, useEffect } from "react";
import { AnimeFilters } from "@/types";

const ALL_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Sci-Fi", "Romance", "Thriller", "Horror", "Slice of Life",
  "Sports", "Mecha", "Music", "Mystery", "Psychological",
  "School", "Supernatural", "Historical",
];

const SORT_OPTIONS = [
  { value: "rating", label: "Top Rated" },
  { value: "year", label: "Newest" },
  { value: "title", label: "A–Z" },
  { value: "episodes", label: "Most Episodes" },
];

interface SearchSidebarProps {
  filters: AnimeFilters;
  onFiltersChange: (filters: AnimeFilters) => void;
}

export default function SearchSidebar({ filters, onFiltersChange }: SearchSidebarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || "");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput || undefined, page: 1 });
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const setGenre = (genre: string) => {
    const newGenre = filters.genre === genre ? undefined : genre;
    onFiltersChange({ ...filters, genre: newGenre, page: 1 });
  };

  const setSort = (sort: AnimeFilters["sort"]) => {
    onFiltersChange({ ...filters, sort, page: 1 });
  };

  const clearAll = () => {
    setSearchInput("");
    onFiltersChange({ sort: "rating", page: 1 });
  };

  const hasActiveFilters = filters.search || filters.genre || (filters.sort && filters.sort !== "rating");

  return (
    <aside className="w-64 flex-shrink-0 space-y-6">
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Search
        </label>
        <div className="relative">
          <input
            id="anime-search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search anime..."
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Sort By
        </label>
        <div className="space-y-1">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSort(value as AnimeFilters["sort"])}
              id={`sort-${value}`}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all duration-150 ${
                (filters.sort || "rating") === value
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Genre
        </label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setGenre(genre)}
              id={`genre-${genre.toLowerCase().replace(/\s+/g, "-")}`}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-150 ${
                filters.genre === genre
                  ? "bg-purple-500 text-white border-purple-500"
                  : "bg-white/5 text-gray-400 border-white/10 hover:border-purple-500/40 hover:text-purple-300"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="w-full py-2 text-sm text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-all"
        >
          Clear All Filters
        </button>
      )}
    </aside>
  );
}

