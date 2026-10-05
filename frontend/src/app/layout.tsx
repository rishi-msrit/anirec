import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AniRec — Anime Watchlist & Recommendations",
    template: "%s | AniRec",
  },
  description:
    "Discover, track, and get personalized anime recommendations powered by collaborative filtering. Your intelligent anime companion.",
  keywords: ["anime", "recommendations", "watchlist", "collaborative filtering", "myanimelist"],
  openGraph: {
    title: "AniRec — Anime Watchlist & Recommendations",
    description: "Personalized anime recommendations powered by collaborative filtering.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-background text-gray-100 antialiased">
        <AuthProvider>
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="glow-orb-purple top-[-100px] left-[-100px]" />
            <div className="glow-orb-pink bottom-[200px] right-[-50px]" />
          </div>

          <Navbar />
          <main className="relative z-10">
            {children}
          </main>


        </AuthProvider>
      </body>
    </html>
  );
}

