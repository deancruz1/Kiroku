import Link from "next/link";
import { cn } from "@/lib/utils";

const RANKINGS = [
  { value: "bypopularity", label: "Most popular" },
  { value: "airing", label: "Airing" },
  { value: "upcoming", label: "Upcoming" },
  { value: "favorite", label: "Most favourited" },
];

export function RankingTabs({ active }: { active?: string }) {
  return (
    <nav
      aria-label="Ranking"
      className="mt-6 flex flex-wrap gap-x-7 border-b border-foreground md:mt-8"
    >
      {RANKINGS.map((r) => (
        <Link
          key={r.value}
          href={`/top?filter=${r.value}`}
          aria-current={active === r.value ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex min-h-10 items-end border-b-2 pb-1.5 hover:text-foreground hover:no-underline",
            active === r.value
              ? "border-vermilion text-foreground"
              : "border-transparent text-muted-foreground",
          )}
        >
          {r.label}
        </Link>
      ))}
    </nav>
  );
}
