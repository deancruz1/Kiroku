"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InlineMessage } from "@/components/inline-message";
import { Skeleton } from "@/components/skeleton";
import {
  StatusGlyph,
  StatusMark,
  STATUS_LABEL,
  STATUS_ORDER,
  type WatchStatus,
} from "@/components/status-mark";
import {
  useAddEntry,
  useEntries,
  useUpdateEntry,
} from "@/hooks/use-entries";

function asStatus(value: string | undefined): WatchStatus | null {
  return value && Object.hasOwn(STATUS_LABEL, value)
    ? (value as WatchStatus)
    : null;
}

export function AddButton({ animeId }: { animeId: number }) {
  const { data: session, status: sessionStatus } = useSession();
  const { data: entries, isPending: entriesPending } = useEntries();
  const addEntry = useAddEntry();
  const updateEntry = useUpdateEntry();

  // Until we know whether the show is on the list, show nothing that could be wrong.
  if (sessionStatus === "loading" || (session && entriesPending)) {
    return <Skeleton className="h-10 w-44" />;
  }

  if (!session) {
    return (
      <Button size="lg" variant="outline" asChild>
        <Link href="/auth/signin">Sign in to track</Link>
      </Button>
    );
  }

  const existing = entries?.find((e) => e.animeId === animeId);
  const error = addEntry.error ?? updateEntry.error;
  // While the add request is in flight the chosen status is shown straight away.
  const shownStatus = asStatus(
    existing?.status ?? (addEntry.isPending ? addEntry.variables?.status : undefined),
  );

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
    <div className="flex flex-col gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {shownStatus ? (
            <Button
              size="lg"
              variant="outline"
              disabled={addEntry.isPending || updateEntry.isPending}
              className="hover:border-foreground hover:bg-transparent aria-expanded:border-foreground aria-expanded:bg-transparent"
            >
              <span className="sr-only">On your watch list: </span>
              <StatusMark status={shownStatus} size="md" />
              <ChevronDown aria-hidden="true" className="ml-1 text-control" />
            </Button>
          ) : existing ? (
            <Button size="lg" variant="outline" disabled={updateEntry.isPending}>
              <Check aria-hidden="true" />
              On your watch list
            </Button>
          ) : (
            <Button size="lg" disabled={entriesPending || addEntry.isPending}>
              <Plus aria-hidden="true" />
              Add to watch list
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-48">
          {STATUS_ORDER.map((value) => (
            <DropdownMenuItem
              key={value}
              onClick={() => handleSelect(value)}
              disabled={existing?.status === value}
              className="min-h-10"
            >
              <StatusGlyph status={value} size="md" />
              {STATUS_LABEL[value]}
              {existing?.status === value && (
                <>
                  <Check aria-hidden="true" className="ml-auto" />
                  <span className="sr-only">(current)</span>
                </>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <InlineMessage>{error.message}</InlineMessage>}
    </div>
  );
}
