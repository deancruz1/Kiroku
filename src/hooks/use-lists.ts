"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { StoredShow } from "@/lib/anime-shape";

export interface CollectionSummary {
  id: string;
  name: string;
  createdAt: string;
  count: number;
  animeIds: number[];
  preview: { animeId: number; anime: StoredShow | null }[];
}

export interface CollectionDetail {
  id: string;
  name: string;
  count: number;
  animes: { id: string; animeId: number; anime: StoredShow | null }[];
}

export const LISTS_KEY = ["user-lists"];

export function useCollections() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: LISTS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/user/lists");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<CollectionSummary[]>;
    },
    enabled: !!session,
  });
}
