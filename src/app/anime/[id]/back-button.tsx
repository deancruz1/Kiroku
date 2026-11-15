"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { backTarget, routeLabel } from "@/lib/back-route";

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

function stored(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function getPreviousLabel() {
  if (!cameFromInsideApp()) return routeLabel("/");
  return routeLabel(stored("previousRoute"));
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

  function goBack() {
    if (!cameFromInsideApp()) {
      router.push("/");
      return;
    }
    const target = backTarget(stored("previousRoute"), stored("routeBefore"));
    if (target.kind === "push") router.push(target.to);
    else router.back();
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="-ml-0.5 inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none"
    >
      <ArrowLeft className="size-4 stroke-[1.75]" aria-hidden="true" />
      {previousLabel ? (
        <>
          <span className="sr-only">Back to </span>
          {previousLabel}
        </>
      ) : (
        "Back"
      )}
    </button>
  );
}
