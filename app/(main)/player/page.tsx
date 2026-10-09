"use client";

import { useServerState } from "@/lib/server-storage";
import { useSession } from "@/lib/auth";
import { Player, World } from "@/types";
import { collectSharedLore } from "@/lib/shared-lore";
import { SharedLoreView } from "@/components/player/shared-lore-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CharacterSheetView } from "@/components/player/character-sheet-view";
import { MyNotebook } from "@/components/player/my-notebook";
import { Loader2 } from "lucide-react";

export default function PlayerPage() {
  const [session, , hSession] = useSession();
  const [players, setPlayers, hPlayers] = useServerState<Player[]>("codex.players", []);
  const [world, , hWorld] = useServerState<World | null>("codex.world", null);

  if (!hSession || !hPlayers || !hWorld) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const player = players.find((p) => p.id === session?.playerId);

  if (!player) {
    return (
      <div className="flex items-center justify-center h-screen text-center px-6">
        <p className="text-muted-foreground italic font-accent">
          Your character record could not be found. Ask your GM to check your player setup.
        </p>
      </div>
    );
  }

  const sharedLore = collectSharedLore(world, player.id);

  const updateCharacter = (patch: Partial<Player["character"]>) => {
    setPlayers((prev) => prev.map((p) => (p.id === player.id ? { ...p, character: { ...p.character, ...patch } } : p)));
  };

  const updateNotes = (notes: Player["notes"]) => {
    setPlayers((prev) => prev.map((p) => (p.id === player.id ? { ...p, notes } : p)));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Tabs defaultValue="character">
        <TabsList className="mb-6">
          <TabsTrigger value="character">Character Sheet</TabsTrigger>
          <TabsTrigger value="notebook">My Notebook ({player.notes.length})</TabsTrigger>
          <TabsTrigger value="lore">Lore ({sharedLore.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="character">
          <CharacterSheetView player={player} onChange={updateCharacter} />
        </TabsContent>

        <TabsContent value="notebook">
          <MyNotebook notes={player.notes} onChange={updateNotes} />
        </TabsContent>

        <TabsContent value="lore">
          <SharedLoreView items={sharedLore} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
