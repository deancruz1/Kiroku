"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { StoredShow } from "@/lib/anime-shape";
import { responseError } from "@/lib/fetch-json";

export interface Entry {
  id: string;
  animeId: number;
  status: string;
  episodes: number;
  rating: number | null;
  notes: string | null;
  anime: StoredShow | null;
}

export interface EntryPatch {
  status?: string;
  episodes?: number;
  rating?: number | null;
}

export const ENTRIES_KEY = ["user-entries"];

export function invalidateEntryViews(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ENTRIES_KEY });
  queryClient.invalidateQueries({ queryKey: ["user-stats"] });
  queryClient.invalidateQueries({ queryKey: ["user-recommendations"] });
}

export function useEntries() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ENTRIES_KEY,
    queryFn: async () => {
      const res = await fetch("/api/user/entries");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<Entry[]>;
    },
    enabled: !!session,
  });
}

export function useAddEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { animeId: number; status: string }) => {
      const res = await fetch("/api/anime/entry", {
        method: "POST",
        body: JSON.stringify(vars),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw await responseError(res, "Could not add it to your watch list");
      return res.json() as Promise<Entry>;
    },
    onSuccess: (entry) => {
      queryClient.setQueryData<Entry[]>(ENTRIES_KEY, (old) =>
        old && !old.some((e) => e.id === entry.id) ? [entry, ...old] : old,
      );
    },
    onSettled: () => invalidateEntryViews(queryClient),
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: EntryPatch }) => {
      const res = await fetch(`/api/user/entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw await responseError(res, "Could not save changes");
      return res.json() as Promise<Entry>;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ENTRIES_KEY });
      const previous = queryClient.getQueryData<Entry[]>(ENTRIES_KEY);
      queryClient.setQueryData<Entry[]>(ENTRIES_KEY, (old) =>
        old?.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
      return { previous };
    },
    onError: (_error, _vars, result) => {
      if (result?.previous) {
        queryClient.setQueryData(ENTRIES_KEY, result.previous);
      }
    },
    onSettled: () => invalidateEntryViews(queryClient),
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/user/entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw await responseError(res, "Could not remove the show");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ENTRIES_KEY });
      const previous = queryClient.getQueryData<Entry[]>(ENTRIES_KEY);
      queryClient.setQueryData<Entry[]>(ENTRIES_KEY, (old) =>
        old?.filter((e) => e.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, result) => {
      if (result?.previous) {
        queryClient.setQueryData(ENTRIES_KEY, result.previous);
      }
    },
    onSettled: () => invalidateEntryViews(queryClient),
  });
}
