"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { Search, User, Menu, X } from "lucide-react";

const links = [
  { href: "/top", label: "Top shows" },
  { href: "/season", label: "Season" },
  { href: "/list", label: "Watch list" },
  { href: "/recommendations", label: "For you" },
  { href: "/stats", label: "Stats" },
  { href: "/lists", label: "Collections" },
];

const MENU_ROW =
  "flex w-full cursor-pointer py-3 text-left text-[17px] hover:no-underline";

function MenuLabel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "border-b-2 pb-0.5",
        active
          ? "border-vermilion text-foreground"
          : "border-transparent text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileQuery, setMobileQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  const showSearch = pathname !== "/" && !pathname.startsWith("/search");

  useEffect(() => {
    if (mobileSearchOpen) {
      mobileInputRef.current?.focus();
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const menuButton = menuButtonRef.current;
        const searchButton = searchButtonRef.current;
        if (menuButton?.getAttribute("aria-expanded") === "true") {
          menuButton.focus();
        } else if (
          searchButton?.getAttribute("aria-expanded") === "true" &&
          document.activeElement === mobileInputRef.current
        ) {
          searchButton.focus();
        }
        setMobileSearchOpen(false);
        setQuery("");
        setMobileQuery("");
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    queueMicrotask(() => setMobileMenuOpen(false));
  }, [pathname]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  }

  function handleMobileSearch(e: React.FormEvent) {
    e.preventDefault();
    if (mobileQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(mobileQuery.trim())}`);
      setMobileSearchOpen(false);
      setMobileQuery("");
    }
  }

  useEffect(() => {
    if (!pathname.startsWith("/anime/")) {
      sessionStorage.setItem("previousRoute", pathname);
    }
  }, [pathname]);

  return (
    <header className="border-b border-rule bg-background">
      <div className="page-frame flex h-14 items-center justify-between gap-3 xl:h-[72px] xl:justify-start xl:gap-10">
        <Link
          href="/"
          className="flex shrink-0 items-baseline gap-2.5 hover:no-underline"
        >
          <b
            lang="ja"
            aria-hidden="true"
            className="text-[22px] font-bold tracking-[.04em] xl:text-[26px]"
          >
            記録
          </b>
          <span className="text-muted-foreground">Kiroku</span>
        </Link>

        <nav aria-label="Main" className="hidden flex-1 gap-7 xl:flex">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "border-b-2 pt-6 pb-[22px] text-base hover:text-foreground hover:no-underline",
                  active
                    ? "border-vermilion text-foreground"
                    : "border-transparent text-muted-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          {showSearch && (
            <form
              role="search"
              onSubmit={handleSearch}
              className="relative mr-2 hidden xl:block"
            >
              <Search
                aria-hidden="true"
                className="absolute top-2.5 left-1.5 size-4 stroke-[1.75] text-muted-foreground"
              />
              <Input
                type="search"
                aria-label="Search anime"
                placeholder="Search anime"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-[220px] pr-2.5 pl-[34px]"
              />
            </form>
          )}

          {showSearch && (
            <Button
              ref={searchButtonRef}
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Search"
              aria-expanded={mobileSearchOpen}
              aria-controls="mobile-search"
              className="text-foreground xl:hidden"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            >
              <Search aria-hidden="true" />
            </Button>
          )}

          <ThemeToggle />

          {session && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="hidden text-foreground xl:inline-flex"
            >
              <Link
                href="/profile"
                aria-label="Profile"
                aria-current={pathname === "/profile" ? "page" : undefined}
              >
                <User aria-hidden="true" />
              </Link>
            </Button>
          )}

          {session ? (
            <Button
              type="button"
              variant="ghost"
              className="hidden xl:inline-flex"
              onClick={() => signOut()}
            >
              Sign out
            </Button>
          ) : (
            <Button variant="ghost" asChild className="hidden xl:inline-flex">
              <Link href="/auth/signin">Sign in</Link>
            </Button>
          )}

          <Button
            ref={menuButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            className="text-foreground xl:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {showSearch && (
        <div
          id="mobile-search"
          hidden={!mobileSearchOpen}
          className="border-t border-rule xl:hidden"
        >
          <form
            role="search"
            onSubmit={handleMobileSearch}
            className="page-frame relative py-3"
          >
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-[calc(var(--gutter)+6px)] size-4 -translate-y-1/2 stroke-[1.75] text-muted-foreground"
            />
            <Input
              ref={mobileInputRef}
              type="search"
              aria-label="Search anime"
              placeholder="Search anime"
              value={mobileQuery}
              onChange={(e) => setMobileQuery(e.target.value)}
              className="pl-[34px]"
            />
          </form>
        </div>
      )}

      <div
        id="mobile-menu"
        hidden={!mobileMenuOpen}
        className="border-t border-rule xl:hidden"
      >
        <div className="page-frame pb-3">
          <nav aria-label="Main">
            <ul>
              {links.map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <li key={href} className="border-b border-rule">
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={MENU_ROW}
                    >
                      <MenuLabel active={active}>{label}</MenuLabel>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <ul>
            {session && (
              <li className="border-b border-rule">
                <Link
                  href="/profile"
                  aria-current={pathname === "/profile" ? "page" : undefined}
                  className={MENU_ROW}
                >
                  <MenuLabel active={pathname === "/profile"}>Profile</MenuLabel>
                </Link>
              </li>
            )}
            <li>
              {session ? (
                <button
                  type="button"
                  className={MENU_ROW}
                  onClick={() => signOut()}
                >
                  <MenuLabel active={false}>Sign out</MenuLabel>
                </button>
              ) : (
                <Link href="/auth/signin" className={MENU_ROW}>
                  <MenuLabel active={pathname === "/auth/signin"}>Sign in</MenuLabel>
                </Link>
              )}
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
