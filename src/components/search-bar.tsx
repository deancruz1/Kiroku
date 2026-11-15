"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      <div className="flex-1">
        <Input
          name="q"
          aria-label="Search anime"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for an anime..."
          className="h-full text-lg px-5"
        />
      </div>
    </form>
  );
}
