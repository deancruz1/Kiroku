import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/app/providers/query-provider";
import { SessionProvider } from "@/app/providers/session-provider";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Kiroku | Anime Watch Tracker",
    template: "%s | Kiroku",
  },
  description:
    "Track your anime, discover seasonal shows, get personalized recommendations, and visualize your watching habits. A full-stack anime tracker powered by the Jikan API.",
  keywords: [
    "anime tracker",
    "watch list",
    "seasonal anime",
    "anime recommendations",
    "anime stats",
    "myanimelist",
  ],
  authors: [{ name: "Dean Cruz" }],
  creator: "Dean Cruz",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://kiroku-nyaa.vercel.app",
    siteName: "Kiroku",
    title: "Kiroku | Anime Watch Tracker",
    description:
      "Track your anime, discover seasonal shows, and get personalized recommendations.",
    images: [
      {
        url: "/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Kiroku - Anime Watch Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kiroku | Anime Watch Tracker",
    description:
      "Track your anime, discover seasonal shows, and get personalized recommendations.",
    images: ["/og-image.webp"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <SessionProvider>
          <QueryProvider>
            <Navbar />
            {children}
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
