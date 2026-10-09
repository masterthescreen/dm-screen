"use client";

import { useServerState } from "@/lib/server-storage";
import { RollRecord, EncounterTable } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GMDice } from "@/components/dice/gm-dice";
import { EncounterTables } from "@/components/dice/encounter-tables";
import { Loader2 } from "lucide-react";

export default function DicePage() {
  const [history, setHistory, h1] = useServerState<RollRecord[]>("codex.dicehistory", []);
  const [tables, setTables, h2] = useServerState<EncounterTable[]>("codex.encountertables", []);

  if (!h1 || !h2) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

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
