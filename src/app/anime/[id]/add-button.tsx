"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
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
  const [loading, setLoading] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  if (!session) {
    return (
      <Button variant="outline" onClick={() => signIn("discord")}>
        Sign in to track
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
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  }

  if (added) {
    return (
      <Button variant="outline" disabled>
        <Check className="h-4 w-4 mr-2" />
        Added to list
      </Button>
    );
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
