"use client";

import { useSyncExternalStore } from "react";
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

// The navigation entry is the URL the browser loaded as a document. Links
// inside the app navigate client-side, so it only matches the current URL when
// this page was opened directly, from another site, or reloaded. In those cases
// the previous history entry may not be part of this site.
function cameFromInsideApp() {
  const entry = performance.getEntriesByType("navigation")[0];
  if (!entry) return false;
  const loaded = new URL(entry.name);
  return (
    loaded.pathname + loaded.search !==
    window.location.pathname + window.location.search
  );
}

function getPreviousLabel() {
  if (!cameFromInsideApp()) return PAGE_LABELS["/"];
  try {
    const prev = sessionStorage.getItem("previousRoute");
    return prev ? PAGE_LABELS[prev] || null : null;
  } catch {
    return null;
  }
}

function subscribe() {
  return () => {};
}

export function BackButton() {
  const router = useRouter();
  const previousLabel = useSyncExternalStore(
    subscribe,
    getPreviousLabel,
    () => null,
  );

  return (
    <button
      onClick={() => {
        if (cameFromInsideApp()) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors cursor-pointer"
    >
      <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
      Back{previousLabel ? ` to ${previousLabel}` : ""}
    </button>
  );
}
