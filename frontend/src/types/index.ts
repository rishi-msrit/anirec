export interface Anime {
  id: number;
  title: string;
  synopsis: string | null;
  genres: string[];
  average_rating: number | null;
  episode_count: number | null;
  year: number | null;
  external_id: number | null;
  image_url: string | null;
}

export interface AnimePaginated {
  items: Anime[];
  total: number;
  page: number;
  pages: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Rating {
  id: number;
  user_id: number;
  anime_id: number;
  score: number;
  created_at: string;
  anime?: Anime;
}

export interface WatchlistEntry {
  id: number;
  user_id: number;
  anime_id: number;
  status: WatchlistStatus;
  added_at: string;
  anime?: Anime;
}

export type WatchlistStatus = "watching" | "completed" | "plan-to-watch";

export interface RecommendationItem {
  anime: Anime;
  predicted_score: number;
  reason: string;
  similar_users_count: number;
}

export interface RecommendationResponse {
  user_id: number;
  recommendations: RecommendationItem[];
  algorithm: string;
}

export interface UserStats {
  user_id: number;
  total_rated: number;
  total_watchlist: number;
  average_score: number | null;
  favorite_genre: string | null;
  watching_count: number;
  completed_count: number;
  plan_to_watch_count: number;
}

export interface AnimeFilters {
  search?: string;
  genre?: string;
  sort?: "rating" | "title" | "year" | "episodes";
  page?: number;
}
