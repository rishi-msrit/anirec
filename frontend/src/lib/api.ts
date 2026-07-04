import {
  Anime,
  AnimePaginated,
  User,
  Rating,
  WatchlistEntry,
  WatchlistStatus,
  RecommendationResponse,
  UserStats,
  AnimeFilters,
} from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchJson<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      body.detail || `HTTP ${response.status}`
    );
  }

  if (response.status === 204) return null as T;

  return response.json();
}

// Anime API

export const animeApi = {
  list: (filters: AnimeFilters = {}): Promise<AnimePaginated> => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.genre) params.set("genre", filters.genre);
    if (filters.sort) params.set("sort", filters.sort);
    if (filters.page) params.set("page", String(filters.page));
    return fetchJson<AnimePaginated>(`/animes?${params.toString()}`);
  },

  get: (id: number): Promise<Anime> =>
    fetchJson<Anime>(`/animes/${id}`),
};

// User API

export const userApi = {
  createOrGet: (username: string, email: string): Promise<User> =>
    fetchJson<User>("/users", {
      method: "POST",
      body: JSON.stringify({ username, email }),
    }),

  get: (userId: number): Promise<User> =>
    fetchJson<User>(`/users/${userId}`),

  getStats: (userId: number): Promise<UserStats> =>
    fetchJson<UserStats>(`/user/${userId}/stats`),
};

// Ratings API

export const ratingsApi = {
  add: (userId: number, animeId: number, score: number): Promise<Rating> =>
    fetchJson<Rating>(`/user/${userId}/ratings`, {
      method: "POST",
      body: JSON.stringify({ anime_id: animeId, score }),
    }),

  list: (userId: number): Promise<Rating[]> =>
    fetchJson<Rating[]>(`/user/${userId}/ratings`),

  remove: (userId: number, animeId: number): Promise<null> =>
    fetchJson<null>(`/user/${userId}/ratings/${animeId}`, {
      method: "DELETE",
    }),
};

// Watchlist API

export const watchlistApi = {
  add: (
    userId: number,
    animeId: number,
    status: WatchlistStatus
  ): Promise<WatchlistEntry> =>
    fetchJson<WatchlistEntry>(`/user/${userId}/watchlist`, {
      method: "POST",
      body: JSON.stringify({ anime_id: animeId, status }),
    }),

  list: (
    userId: number,
    status?: WatchlistStatus
  ): Promise<WatchlistEntry[]> => {
    const params = status ? `?status=${status}` : "";
    return fetchJson<WatchlistEntry[]>(`/user/${userId}/watchlist${params}`);
  },

  updateStatus: (
    userId: number,
    animeId: number,
    status: WatchlistStatus
  ): Promise<WatchlistEntry> =>
    fetchJson<WatchlistEntry>(`/user/${userId}/watchlist/${animeId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  remove: (userId: number, animeId: number): Promise<null> =>
    fetchJson<null>(`/user/${userId}/watchlist/${animeId}`, {
      method: "DELETE",
    }),
};

// Recommendations API

export const recommendApi = {
  get: (userId: number): Promise<RecommendationResponse> =>
    fetchJson<RecommendationResponse>(`/user/${userId}/recommend`),
};

export { ApiError };

