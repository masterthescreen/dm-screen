"use client";

import { usePlayers } from "@/lib/use-players";
import { PlayerManager } from "@/components/players/player-manager";
import { InvitePanel } from "@/components/players/invite-panel";
import { Loader2 } from "lucide-react";

export default function PlayersPage() {
  const { players, loaded, refresh, create, patch, remove, resetCode, sendNote, deleteNote } = usePlayers();

  if (!loaded) {
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
          Create an invite code so players can make their own accounts, or add a player yourself. Share lore with them
          from the Lore Codex.
        </p>
      </div>
      <div className="mb-6">
        <InvitePanel />
      </div>
      <PlayerManager players={players} actions={{ create, patch, remove, resetCode, sendNote, deleteNote, refresh }} />
    </div>
  );
}
