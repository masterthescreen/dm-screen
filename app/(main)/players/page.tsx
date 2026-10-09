"use client";

import { useServerState } from "@/lib/server-storage";
import { Player } from "@/types";
import { PlayerManager } from "@/components/players/player-manager";
import { Loader2 } from "lucide-react";

export default function PlayersPage() {
  const [players, setPlayers, hydrated] = useServerState<Player[]>("codex.players", []);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 border-b border-border/60 pb-5">
        <h1 className="font-display text-3xl font-bold">Players</h1>
        <p className="text-muted-foreground mt-1">
          Add the people at your table, set their login passcodes, and manage their characters. Share lore with them
          from the Lore Codex.
        </p>
      </div>
      <PlayerManager players={players} onChange={setPlayers} />
    </div>
  );
}
