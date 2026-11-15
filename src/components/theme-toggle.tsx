"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  THEME_COLORS,
  THEME_META_ID,
  THEME_STORAGE_KEY,
} from "@/components/theme-script";

export type Theme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  let meta = document.getElementById(THEME_META_ID) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.id = THEME_META_ID;
    document.head.prepend(meta);
  }
  meta.content = THEME_COLORS[theme];
}

export function syncTheme() {
  const stored = storedTheme();
  const system: Theme = matchMedia(DARK_QUERY).matches ? "dark" : "light";
  applyTheme(stored ?? system);
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
  applyTheme(theme);
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY || e.key === null) syncTheme();
  };
  const query = matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    if (!storedTheme()) syncTheme();
  };
  window.addEventListener("storage", onStorage);
  query.addEventListener("change", onSystemChange);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onStorage);
    query.removeEventListener("change", onSystemChange);
  };
}

function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

// null on the server and during hydration, then the theme the page is showing.
export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribe, currentTheme, () => null);
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const label = theme
    ? `Switch to ${theme === "dark" ? "light" : "dark"} theme`
    : "Switch theme";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={() => setTheme(currentTheme() === "dark" ? "light" : "dark")}
      className={cn("text-foreground", className)}
    >
      <Moon aria-hidden="true" className="dark:hidden" />
      <Sun aria-hidden="true" className="hidden dark:block" />
    </Button>
  );
}
