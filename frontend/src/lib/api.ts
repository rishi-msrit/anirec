import {
  Anime,
  AnimePaginated,
  AuthResponse,
  Rating,
  WatchlistEntry,
  WatchlistStatus,
  RecommendationResponse,
  UserStats,
  AnimeFilters,
} from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// In-memory token storage (never in localStorage to prevent XSS)
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let isRefreshing = false;
let refreshPromise: Promise<AuthResponse | null> | null = null;

async function tryRefresh(): Promise<AuthResponse | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const data: AuthResponse = await res.json();
      setAccessToken(data.access_token);
      return data;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function fetchJson<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // On 401, try refreshing the token once
  if (response.status === 401 && !path.startsWith("/auth/")) {
    const refreshResult = await tryRefresh();
    if (refreshResult) {
      headers["Authorization"] = `Bearer ${refreshResult.access_token}`;
      const retryResponse = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });

      if (!retryResponse.ok) {
        const body = await retryResponse.json().catch(() => ({}));
        throw new ApiError(
          retryResponse.status,
          body.detail || `HTTP ${retryResponse.status}`
        );
      }
      if (retryResponse.status === 204) return null as T;
      return retryResponse.json();
    }

    // Refresh failed — clear token and throw
    setAccessToken(null);
    throw new ApiError(401, "Session expired. Please sign in again.");
  }

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

// Auth API

export const authApi = {
  signup: (username: string, email: string, password: string): Promise<AuthResponse> =>
    fetchJson<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    }),

  login: (email: string, password: string): Promise<AuthResponse> =>
    fetchJson<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  refresh: (): Promise<AuthResponse | null> => tryRefresh(),

  logout: (): Promise<null> =>
    fetchJson<null>("/auth/logout", { method: "POST" }),

  me: (): Promise<AuthResponse> =>
    fetchJson<AuthResponse>("/auth/me"),
};

// Anime API (public — no auth required)

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
  get: (userId: number): Promise<import("@/types").User> =>
    fetchJson<import("@/types").User>(`/users/${userId}`),

  getStats: (): Promise<UserStats> =>
    fetchJson<UserStats>(`/user/stats`),
};

// Ratings API (all protected)

export const ratingsApi = {
  add: (animeId: number, score: number): Promise<Rating> =>
    fetchJson<Rating>(`/user/ratings`, {
      method: "POST",
      body: JSON.stringify({ anime_id: animeId, score }),
    }),

  list: (): Promise<Rating[]> =>
    fetchJson<Rating[]>(`/user/ratings`),

  remove: (animeId: number): Promise<null> =>
    fetchJson<null>(`/user/ratings/${animeId}`, {
      method: "DELETE",
    }),
};

// Watchlist API (all protected)

export const watchlistApi = {
  add: (
    animeId: number,
    status: WatchlistStatus
  ): Promise<WatchlistEntry> =>
    fetchJson<WatchlistEntry>(`/user/watchlist`, {
      method: "POST",
      body: JSON.stringify({ anime_id: animeId, status }),
    }),

  list: (status?: WatchlistStatus): Promise<WatchlistEntry[]> => {
    const params = status ? `?status=${status}` : "";
    return fetchJson<WatchlistEntry[]>(`/user/watchlist${params}`);
  },

  updateStatus: (
    animeId: number,
    status: WatchlistStatus
  ): Promise<WatchlistEntry> =>
    fetchJson<WatchlistEntry>(`/user/watchlist/${animeId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  remove: (animeId: number): Promise<null> =>
    fetchJson<null>(`/user/watchlist/${animeId}`, {
      method: "DELETE",
    }),
};

// Recommendations API (protected)

export const recommendApi = {
  get: (): Promise<RecommendationResponse> =>
    fetchJson<RecommendationResponse>(`/user/recommend`),
};

export { ApiError };
