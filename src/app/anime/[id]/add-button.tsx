"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_LABELS: Record<string, string> = {
  watching: "Watching",
  completed: "Completed",
  plan_to_watch: "Plan to Watch",
  dropped: "Dropped",
};

export function AddButton({ animeId }: { animeId: number }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  const { data: entries } = useQuery({
    queryKey: ["user-entries"],
    queryFn: async () => {
      const res = await fetch("/api/user/entries");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!session,
  });

  if (entries && !added) {
    const existing = entries.find(
      (e: { animeId: number; status: string }) => e.animeId === animeId,
    );
    if (existing && !added) {
      setTimeout(() => {
        setAdded(true);
        setExistingStatus(existing.status);
      }, 0);
    }
  }

  if (!session) {
    return (
      <Button variant="outline" asChild>
        <Link href="/auth/signin">Sign in to track</Link>
      </Button>
    );
  }

  if (added) {
    return (
      <Button variant="outline" disabled>
        <Check className="h-4 w-4 mr-2" />
        {existingStatus
          ? `In ${STATUS_LABELS[existingStatus]}`
          : "Added to list"}
      </Button>
    );
  }

  async function handleAdd(status: string) {
    setLoading(status);
    try {
      const res = await fetch("/api/anime/entry", {
        method: "POST",
        body: JSON.stringify({ animeId, status }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setAdded(true);
        setExistingStatus(status);
        queryClient.invalidateQueries({ queryKey: ["user-entries"] });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {loading ? "Adding..." : "Add to List"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <DropdownMenuItem
            key={value}
            onClick={() => handleAdd(value)}
            disabled={loading === value}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
