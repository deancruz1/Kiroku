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
} from "lucide-react";

const links = [
  { href: "/top", label: "Top Shows", icon: TrendingUp },
  { href: "/season", label: "Season", icon: Tv },
  { href: "/list", label: "Watch List", icon: List },
  { href: "/lists", label: "Collections", icon: FolderHeart },
  { href: "/recommendations", label: "For You", icon: Sparkles },
  { href: "/stats", label: "My Stats", icon: BarChart3 },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const showSearch = pathname !== "/" && !pathname.startsWith("/search");

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [searchOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery("");
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="font-bold text-lg mr-4 hover:text-primary transition-colors shrink-0"
          >
            Kiroku.
          </Link>
          <nav className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                variant={pathname === href ? "secondary" : "ghost"}
                size="sm"
                asChild
              >
                <Link href={href}>
                  <Icon className="h-4 w-4 mr-1.5" />
                  {label}
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          {showSearch && (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <AnimatePresence initial={false}>
                {searchOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "16rem", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <Input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search anime..."
                      className="h-8 text-sm rounded-md focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                type="button"
                className="h-8 w-8 inline-flex items-center justify-center shrink-0 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
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

          {session ? (
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign out
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link href="/auth/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
