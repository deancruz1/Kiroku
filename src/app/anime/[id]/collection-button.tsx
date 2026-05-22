"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface CustomList {
  id: string;
  name: string;
  animes?: { animeId: number }[];
}

export function CollectionButton({ animeId }: { animeId: number }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [addedList, setAddedList] = useState<string | null>(null);

  const { data: lists } = useQuery({
    queryKey: ["user-lists"],
    queryFn: async () => {
      const res = await fetch("/api/user/lists");
      if (!res.ok) return [];
      return res.json() as Promise<CustomList[]>;
    },
    enabled: !!session,
  });

  if (!session) return null;

  function isInList(list: CustomList) {
    return list.animes?.some((a) => a.animeId === animeId);
  }

  async function handleAdd(listId: string) {
    setAdding(listId);
    try {
      const res = await fetch(`/api/user/lists/${listId}/anime`, {
        method: "POST",
        body: JSON.stringify({ animeId }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setAddedList(listId);
        queryClient.invalidateQueries({ queryKey: ["user-lists"] });
      }
    } catch {
      // ignore
    }
    setAdding(null);
  }

  async function handleCreateAndAdd() {
    if (!newName.trim()) return;
    setAdding("__new__");
    try {
      const res = await fetch("/api/user/lists", {
        method: "POST",
        body: JSON.stringify({ name: newName }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const list = await res.json();
        queryClient.invalidateQueries({ queryKey: ["user-lists"] });
        await handleAdd(list.id);
        setNewName("");
      }
    } catch {
      // ignore
    }
    setAdding(null);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <FolderPlus className="h-4 w-4 mr-2" />
          {addedList ? "Added" : "Add to Collection"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {lists && lists.length > 0 && (
          <>
            {lists.map((list) => {
              const alreadyIn = isInList(list);
              return (
                <DropdownMenuItem
                  key={list.id}
                  onClick={() => !alreadyIn && handleAdd(list.id)}
                  disabled={adding === list.id || alreadyIn}
                  className="flex items-center justify-between"
                >
                  <span>{list.name}</span>
                  {alreadyIn && (
                    <span className="text-xs text-muted-foreground">
                      In list
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
          </>
        )}
        <div className="px-2 py-1.5 flex gap-1">
          <Input
            placeholder="New collection..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
            className="h-7 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            size="sm"
            className="h-7 text-xs shrink-0"
            onClick={handleCreateAndAdd}
            disabled={adding === "__new__" || !newName.trim()}
          >
            Create
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
