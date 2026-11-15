"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBar({ defaultQuery = "" }: { defaultQuery?: string }) {
  const [query, setQuery] = useState(defaultQuery);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex items-stretch gap-2 w-full h-14"
    >
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="absolute top-1/2 left-1 size-5 -translate-y-1/2 stroke-[1.75] text-muted-foreground"
        />
        <Input
          name="q"
          aria-label="Search shows"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a show"
          className="h-full pl-9 text-xl md:text-2xl"
        />
      </div>
    </form>
  );
}
