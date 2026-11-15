"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineMessage } from "@/components/inline-message";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  LISTS_KEY,
  useCollections,
  type CollectionSummary,
} from "@/hooks/use-lists";
import { responseError } from "@/lib/fetch-json";
import { LIST_NAME_MAX } from "@/lib/entry-validation";

export function CollectionButton({ animeId }: { animeId: number }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [addedList, setAddedList] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: lists, isError } = useCollections();

  if (!session) return null;

  function isInList(list: CollectionSummary) {
    return list.animeIds.includes(animeId);
  }

  async function addToList(listId: string, listName: string) {
    const res = await fetch(`/api/user/lists/${listId}/anime`, {
      method: "POST",
      body: JSON.stringify({ animeId }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok || res.status === 409) {
      setAddedList(listId);
      if (res.status === 409) setMessage(`Already in ${listName}`);
      return;
    }
    throw await responseError(res, `Could not add to ${listName}`);
  }

  async function handleAdd(listId: string, listName: string) {
    setAdding(listId);
    setMessage(null);
    setError(null);
    try {
      await addToList(listId, listName);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : `Could not add to ${listName}`,
      );
    } finally {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["list", listId] });
      setAdding(null);
    }
  }

  async function handleCreateAndAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding("__new__");
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/user/lists", {
        method: "POST",
        body: JSON.stringify({ name }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw await responseError(res, "Could not create the collection");
      const list = await res.json();
      setNewName("");
      await addToList(list.id, list.name);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not create the collection",
      );
    } finally {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      setAdding(null);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="lg" variant="outline">
            <FolderPlus aria-hidden="true" />
            {addedList ? "Added to collection" : "Add to collection"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {isError && !lists && (
            <>
              <DropdownMenuItem disabled>
                Could not load your collections
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {lists && lists.length > 0 && (
            <>
              {lists.map((list) => {
                const alreadyIn = isInList(list);
                return (
                  <DropdownMenuItem
                    key={list.id}
                    onClick={() => !alreadyIn && handleAdd(list.id, list.name)}
                    disabled={adding === list.id || alreadyIn}
                    className="flex min-h-10 items-center justify-between gap-3"
                  >
                    <span className="min-w-0 truncate">{list.name}</span>
                    {alreadyIn && (
                      <span className="shrink-0 text-[15px] text-muted-foreground">
                        Added
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
            </>
          )}
          <div className="flex items-end gap-2 px-2 py-1.5">
            <Input
              placeholder="New collection"
              aria-label="New collection name"
              value={newName}
              maxLength={LIST_NAME_MAX}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
              className="h-10"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              size="lg"
              variant="outline"
              className="shrink-0 px-3"
              onClick={handleCreateAndAdd}
              disabled={adding === "__new__" || !newName.trim()}
            >
              Create
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {message && <InlineMessage tone="success">{message}</InlineMessage>}
      {error && <InlineMessage>{error}</InlineMessage>}
    </div>
  );
}
