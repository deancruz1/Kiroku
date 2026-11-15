"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const PAGE_LABELS: Record<string, string> = {
  "/search": "Search",
  "/top": "Top shows",
  "/season": "Season",
  "/list": "Watch list",
  "/recommendations": "For you",
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
      type="button"
      onClick={() => {
        if (cameFromInsideApp()) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      className="-ml-0.5 inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4 stroke-[1.75]" aria-hidden="true" />
      Back{previousLabel ? ` to ${previousLabel}` : ""}
    </button>
  );
}
