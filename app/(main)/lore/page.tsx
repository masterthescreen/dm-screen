"use client";

import { useState } from "react";
import { useServerState } from "@/lib/server-storage";
import { World } from "@/types";
import { usePlayers } from "@/lib/use-players";
import { sampleWorld } from "@/lib/lore-data";
import { findEntity, updateWorld, addEntity, deleteEntity } from "@/lib/lore-ops";
import { LoreTree, Selection } from "@/components/lore/lore-tree";
import { LoreDetail } from "@/components/lore/lore-detail";
import { Loader2 } from "lucide-react";

export default function LorePage() {
  const [world, setWorld, hydrated] = useServerState<World>("codex.world", sampleWorld());
  const { players, loaded: playersHydrated } = usePlayers();
  const [selection, setSelection] = useState<Selection>({ level: "world" });

  if (!hydrated || !playersHydrated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const entity = findEntity(world, selection);

  const handleDelete = () => {
    const parentSelection: Selection =
      selection.level === "continent"
        ? { level: "world" }
        : selection.level === "kingdom"
        ? { level: "continent", continentId: selection.continentId }
        : selection.level === "city"
        ? { level: "kingdom", continentId: selection.continentId, kingdomId: selection.kingdomId }
        : { level: "city", continentId: selection.continentId, kingdomId: selection.kingdomId, cityId: selection.cityId };
    setWorld((prev) => deleteEntity(prev, selection));
    setSelection(parentSelection);
  };

  return (
    <div className="flex h-screen">
      <div className="w-80 shrink-0 border-r border-border/60 bg-card/60 p-4 overflow-y-auto scrollbar-ornate">
        <h2 className="font-display text-lg font-bold mb-3 px-2">World Codex</h2>
        <LoreTree
          world={world}
          selection={selection}
          onSelect={setSelection}
          onAdd={(level, parent) => {
            setWorld((prev) => addEntity(prev, level, parent));
          }}
        />
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-ornate">
        <LoreDetail
          selection={selection}
          entity={entity}
          onChange={(patch) => setWorld((prev) => updateWorld(prev, selection, patch as Record<string, unknown>))}
          onDelete={handleDelete}
          players={players}
        />
      </div>
    </div>
  );
}
