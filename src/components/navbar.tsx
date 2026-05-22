"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  List,
  Calendar,
  BarChart3,
  Search,
  LogOut,
  TrendingUp,
  Sparkles,
} from "lucide-react";

const links = [
  { href: "/", label: "Search", icon: Search },
  { href: "/top", label: "Top", icon: TrendingUp },
  { href: "/season", label: "Season", icon: Calendar },
  { href: "/list", label: "My List", icon: List },
  { href: "/recommendations", label: "For You", icon: Sparkles },
  { href: "/stats", label: "Stats", icon: BarChart3 },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="font-bold text-lg mr-4 hover:text-primary transition-colors"
          >
            Kiroku
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

        <div>
          {session ? (
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign out
            </Button>
          ) : (
            <Button size="sm" onClick={() => signIn("discord")}>
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
