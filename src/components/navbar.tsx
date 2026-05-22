"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  List,
  Calendar,
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
  { href: "/recommendations", label: "For You", icon: Sparkles },
  { href: "/stats", label: "My Stats", icon: BarChart3 },
  { href: "/lists", label: "Collections", icon: FolderHeart },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="font-bold text-xl mr-6 hover:text-primary transition-colors shrink-0"
          >
            Kiroku | 記録
          </Link>
          <nav className="flex items-center gap-1">
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
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="default" asChild>
            <Link href="/search">
              <Search className="h-4 w-4" />
            </Link>
          </Button>

          {session ? (
            <Button variant="ghost" size="default" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          ) : (
            <Button size="default" asChild>
              <Link href="/auth/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
