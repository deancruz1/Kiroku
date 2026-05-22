"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

interface Entry {
  id: string;
  animeId: number;
  status: string;
  episodes: number;
  rating: number | null;
}

export function useEntries() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["user-entries"],
    queryFn: async () => {
      const res = await fetch("/api/user/entries");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<Entry[]>;
    },
    enabled: !!session,
  });
}
