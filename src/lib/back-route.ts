const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/search": "Search",
  "/top": "Top shows",
  "/season": "Season",
  "/list": "Watch list",
  "/recommendations": "For you",
  "/stats": "Stats",
  "/lists": "Collections",
  "/profile": "Profile",
};

// The label for a stored route such as "/top?filter=airing&page=2".
export function routeLabel(route: string | null | undefined) {
  if (!route) return null;
  const pathname = route.split(/[?#]/)[0];
  if (Object.hasOwn(PAGE_LABELS, pathname)) return PAGE_LABELS[pathname];
  if (/^\/lists\/[^/]+$/.test(pathname)) return "Collection";
  return null;
}

// Going back in history keeps the list's scroll position, so it is used when
// the page before this show is the one the label names. Otherwise the stored
// route is opened again, query included.
export function backTarget(
  previousRoute: string | null,
  routeBefore: string | null,
): { kind: "history" } | { kind: "push"; to: string } {
  if (!previousRoute || previousRoute === routeBefore) return { kind: "history" };
  return { kind: "push", to: previousRoute };
}
