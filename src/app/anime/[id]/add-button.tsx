"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useAddEntry,
  useEntries,
  useUpdateEntry,
} from "@/hooks/use-entries";

const STATUS_LABELS: Record<string, string> = {
  watching: "Watching",
  completed: "Completed",
  plan_to_watch: "Plan to Watch",
  dropped: "Dropped",
};

export function AddButton({ animeId }: { animeId: number }) {
  const { data: session, status: sessionStatus } = useSession();
  const { data: entries, isPending: entriesPending } = useEntries();
  const addEntry = useAddEntry();
  const updateEntry = useUpdateEntry();

  if (sessionStatus === "loading") {
    return (
      <Button disabled>
        <Plus className="h-4 w-4 mr-2" />
        Add to List
      </Button>
    );
  }

  if (!session) {
    return (
      <Button variant="outline" asChild>
        <Link href="/auth/signin">Sign in to track</Link>
      </Button>
    );
  }

  const existing = entries?.find((e) => e.animeId === animeId);
  const error = addEntry.error ?? updateEntry.error;

  function handleSelect(status: string) {
    addEntry.reset();
    updateEntry.reset();
    if (existing) {
      if (existing.status !== status) {
        updateEntry.mutate({ id: existing.id, patch: { status } });
      }
    } else {
      addEntry.mutate({ animeId, status });
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {existing ? (
            <Button variant="outline" disabled={updateEntry.isPending}>
              <Check className="h-4 w-4 mr-2" />
              {`In ${STATUS_LABELS[existing.status] ?? "your list"}`}
            </Button>
          ) : (
            <Button disabled={entriesPending || addEntry.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              {addEntry.isPending ? "Adding..." : "Add to List"}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <DropdownMenuItem
              key={value}
              onClick={() => handleSelect(value)}
              disabled={existing?.status === value}
            >
              {existing?.status === value && <Check className="h-4 w-4" />}
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}
