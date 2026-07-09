"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/", label: "Browse" },
  { href: "/recommendations", label: "For You" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/dashboard", label: "Dashboard" },
];

type AuthTab = "signin" | "signup";

export default function Navbar() {
  const pathname = usePathname();
  const { user, login, signup, logout, isLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("signin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setUsername("");
    setError("");
    setShowPassword(false);
  };

  const openAuth = (tab: AuthTab = "signin") => {
    resetForm();
    setAuthTab(tab);
    setShowAuth(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (authTab === "signup") {
        if (!username.trim() || !email.trim() || !password) {
          setError("All fields are required");
          return;
        }
        await signup(username.trim(), email.trim().toLowerCase(), password);
      } else {
        if (!email.trim() || !password) {
          setError("Email and password are required");
          return;
        }
        await login(email.trim().toLowerCase(), password);
      }
      setShowAuth(false);
      resetForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent group-hover:from-purple-300 group-hover:to-pink-400 transition-all">
                AniRec
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(({ href, label }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              {isLoading ? (
                <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                      {user.username[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-300">{user.username}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors px-2 py-1"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-sm text-gray-500">
                    Browsing as guest
                  </span>
                  <button
                    id="login-btn"
                    onClick={() => openAuth("signin")}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25 active:scale-95"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="md:hidden flex border-t border-white/5">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center py-2.5 text-xs transition-colors ${
                  isActive ? "text-purple-400" : "text-gray-500"
                }`}
              >
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {showAuth && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAuth(false);
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-[#1a1a2e] border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">
              {authTab === "signin" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              {authTab === "signin"
                ? "Sign in to access your watchlist and recommendations"
                : "Join AniRec to start tracking anime"}
            </p>

            {/* Tab switcher */}
            <div className="flex rounded-xl bg-white/5 p-1 mb-6">
              <button
                type="button"
                onClick={() => { setAuthTab("signin"); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  authTab === "signin"
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab("signup"); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  authTab === "signup"
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {authTab === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    id="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. anime_fan_42"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                    autoFocus
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                  autoFocus={authTab === "signin"}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={authTab === "signup" ? "Min 6 characters" : "Your password"}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all pr-12"
                    minLength={authTab === "signup" ? 6 : 1}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuth(false)}
                  className="flex-1 px-4 py-3 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  id="submit-auth"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isSubmitting
                    ? "Please wait..."
                    : authTab === "signin"
                    ? "Sign In"
                    : "Create Account"}
                </button>
              </div>
            </form>

            <p className="text-center text-gray-500 text-xs mt-4">
              {authTab === "signin" ? (
                <>
                  No account?{" "}
                  <button
                    type="button"
                    onClick={() => { setAuthTab("signup"); setError(""); }}
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setAuthTab("signin"); setError(""); }}
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
