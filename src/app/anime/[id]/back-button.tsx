"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const PAGE_LABELS: Record<string, string> = {
  "/search": "Search",
  "/top": "Top Shows",
  "/season": "Season",
  "/list": "Watch List",
  "/recommendations": "For You",
  "/stats": "Stats",
  "/lists": "Collections",
  "/": "Home",
};

export function BackButton() {
  const router = useRouter();

  let previousLabel: string | null = null;
  if (typeof window !== "undefined") {
    const prev = sessionStorage.getItem("previousRoute");
    if (prev) {
      previousLabel = PAGE_LABELS[prev] || null;
    }
  }

  return (
    <button
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors cursor-pointer"
    >
      <ArrowLeft className="h-4 w-4 mr-1" />
      Back{previousLabel ? ` to ${previousLabel}` : ""}
    </button>
  );
}
