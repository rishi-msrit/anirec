"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { User } from "@/types";
import { authApi, setAccessToken } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isGuest: boolean;
  signup: (username: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Try to restore session from refresh token cookie on mount
  const restoreSession = useCallback(async () => {
    try {
      const result = await authApi.refresh();
      if (result) {
        setAccessToken(result.access_token);
        setUser(result.user);
      }
    } catch {
      // No valid session — user stays as guest
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const signup = async (username: string, email: string, password: string) => {
    const result = await authApi.signup(username, email, password);
    setAccessToken(result.access_token);
    setUser(result.user);
  };

  const login = async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    setAccessToken(result.access_token);
    setUser(result.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Logout endpoint might fail, but we clear locally regardless
    }
    setAccessToken(null);
    setUser(null);
  };

  const isGuest = !user && !isLoading;

  return (
    <AuthContext.Provider value={{ user, isLoading, isGuest, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
