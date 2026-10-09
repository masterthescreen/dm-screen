"use client";

import { useEffect, useState } from "react";
import { useServerState } from "@/lib/server-storage";
import { api } from "@/lib/api";
import { useMe } from "@/components/me-provider";
import { RollRecord, EncounterTable } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GMDice } from "@/components/dice/gm-dice";
import { EncounterTables } from "@/components/dice/encounter-tables";
import { Loader2 } from "lucide-react";

function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>
  );
}

// GM: GM dice (private history) and the random-encounter tables (secret prep).
function GmDiceTower() {
  const [history, setHistory, h1] = useServerState<RollRecord[]>("codex.dicehistory", []);
  const [tables, setTables, h2] = useServerState<EncounterTable[]>("codex.encountertables", []);
  if (!h1 || !h2) return <Spinner />;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 border-b border-border/60 pb-5">
        <h1 className="font-display text-3xl font-bold">Dice Tower</h1>
        <p className="text-muted-foreground mt-1">Fate favors the prepared GM.</p>
      </div>
      <Tabs defaultValue="gm">
        <TabsList className="mb-6">
          <TabsTrigger value="gm">GM Dice</TabsTrigger>
          <TabsTrigger value="random">Random Encounter Dice</TabsTrigger>
        </TabsList>
        <TabsContent value="gm">
          <GMDice history={history} onChange={setHistory} />
        </TabsContent>
        <TabsContent value="random">
          <EncounterTables tables={tables} onChange={setTables} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Player: their own dice and history only. The GM's rolls and encounter tables are never sent to players.
function PlayerDiceTower({ initial }: { initial: RollRecord[] }) {
  const [rolls, setRolls] = useState<RollRecord[]>(initial);

  useEffect(() => setRolls(initial), [initial]);

  const save = (next: RollRecord[]) => {
    setRolls(next);
    api("/api/me/rolls", { method: "PUT", body: { rolls: next } }).catch(() => undefined);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 border-b border-border/60 pb-5">
        <h1 className="font-display text-3xl font-bold">Dice Tower</h1>
        <p className="text-muted-foreground mt-1">Roll your own dice. Your history is saved to your character.</p>
      </div>
      <GMDice history={rolls} onChange={save} />
    </div>
  );
}

export default function DicePage() {
  const { me, loaded } = useMe();
  if (!loaded || !me) return <Spinner />;
  return me.role === "gm" ? <GmDiceTower /> : <PlayerDiceTower initial={me.player.rolls} />;
}
