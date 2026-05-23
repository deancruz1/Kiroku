"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  List,
  BarChart3,
  Search,
  LogOut,
  TrendingUp,
  Sparkles,
  FolderHeart,
  Tv,
  User,
  Menu,
  X,
} from "lucide-react";

const links = [
  { href: "/top", label: "Top Shows", icon: TrendingUp },
  { href: "/season", label: "Season", icon: Tv },
  { href: "/list", label: "Watch List", icon: List },
  { href: "/recommendations", label: "For You", icon: Sparkles },
  { href: "/stats", label: "My Stats", icon: BarChart3 },
  { href: "/lists", label: "Collections", icon: FolderHeart },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileQuery, setMobileQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const showSearch = pathname !== "/" && !pathname.startsWith("/search");

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 150);
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
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
      setSearchOpen(false);
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
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-3 sm:px-4 flex items-center justify-between h-14 sm:h-16">
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="font-bold text-lg sm:text-xl mr-2 sm:mr-6 hover:text-primary transition-colors shrink-0"
          >
            <span className="hidden sm:inline">Kiroku | 記録</span>
            <span className="sm:hidden">Kiroku</span>
          </Link>

          {/* Desktop nav (xl+) */}
          <nav className="hidden xl:flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                variant={pathname === href ? "secondary" : "ghost"}
                size="default"
                asChild
                className="text-sm"
              >
                <Link href={href}>
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </Link>
              </Button>
            ))}
          </nav>

          {/* Tablet nav (md-xl) - icons only */}
          <nav className="hidden md:flex xl:hidden items-center gap-0.5">
            {links.map(({ href, icon: Icon }) => (
              <Button
                key={href}
                variant={pathname === href ? "secondary" : "ghost"}
                size="default"
                asChild
                className="px-2"
              >
                <Link href={href}>
                  <Icon className="h-4 w-4" />
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Desktop Search (lg+) */}
          {showSearch && (
            <form
              onSubmit={handleSearch}
              className="hidden lg:flex items-center gap-1 sm:gap-2"
            >
              <AnimatePresence initial={false}>
                {searchOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "14rem", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <Input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search anime..."
                      className="h-9 text-sm rounded-md focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                type="button"
                className={`h-9 w-9 inline-flex items-center justify-center shrink-0 rounded-md transition-colors cursor-pointer ${
                  searchOpen
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
                onClick={() => {
                  if (searchOpen && query.trim()) {
                    handleSearch(
                      new Event("submit") as unknown as React.FormEvent,
                    );
                  } else {
                    setSearchOpen(!searchOpen);
                  }
                }}
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* Mobile/Tablet Search Icon (< lg) */}
          {showSearch && (
            <button
              type="button"
              className="lg:hidden h-9 w-9 inline-flex items-center justify-center shrink-0 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            >
              <Search className="h-4 w-4" />
            </button>
          )}

          {session && (
            <Button
              variant="ghost"
              size="default"
              asChild
              className="px-2 sm:px-3"
            >
              <Link href="/profile">
                <User className="h-4 w-4" />
              </Link>
            </Button>
          )}

          {session ? (
            <Button
              variant="ghost"
              size="default"
              onClick={() => signOut()}
              className="cursor-pointer px-2 sm:px-3"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          ) : (
            <Button size="default" asChild className="text-sm">
              <Link href="/auth/signin">Sign in</Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="default"
            className="md:hidden px-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile/Tablet Search Bar (< lg) */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="lg:hidden border-t bg-background overflow-hidden"
          >
            <form onSubmit={handleMobileSearch} className="p-3">
              <Input
                ref={mobileInputRef}
                value={mobileQuery}
                onChange={(e) => setMobileQuery(e.target.value)}
                placeholder="Search anime..."
                className="h-9 text-sm rounded-md focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu (< md) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="md:hidden border-t bg-background overflow-hidden"
          >
            <nav className="flex flex-col p-3 gap-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Button
                  key={href}
                  variant={pathname === href ? "secondary" : "ghost"}
                  size="default"
                  asChild
                  className="justify-start"
                >
                  <Link href={href}>
                    <Icon className="h-4 w-4 mr-3" />
                    {label}
                  </Link>
                </Button>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
