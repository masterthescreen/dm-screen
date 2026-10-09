"use client";

import { useServerState } from "@/lib/server-storage";
import { Monster, Encounter, Combatant } from "@/types";
import { usePlayers } from "@/lib/use-players";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonsterList } from "@/components/combat/monster-list";
import { EncounterBuilder } from "@/components/combat/encounter-builder";
import { InitiativeTracker } from "@/components/combat/initiative-tracker";
import { Loader2 } from "lucide-react";

export default function CombatPage() {
  const [monsters, setMonsters, h1] = useServerState<Monster[]>("codex.monsters", []);
  const [encounters, setEncounters, h2] = useServerState<Encounter[]>("codex.encounters", []);
  const [combatants, setCombatants, h3] = useServerState<Combatant[]>("codex.combatants", []);
  const { players, loaded: h4 } = usePlayers();

  if (!h1 || !h2 || !h3 || !h4) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 border-b border-border/60 pb-5">
        <h1 className="font-display text-3xl font-bold">Combat Table</h1>
        <p className="text-muted-foreground mt-1">Catalog your foes, draft encounters, and track the fray.</p>
      </div>

      <Tabs defaultValue="initiative">
        <TabsList className="mb-6">
          <TabsTrigger value="initiative">Initiative Tracker</TabsTrigger>
          <TabsTrigger value="encounters">Encounter Builder</TabsTrigger>
          <TabsTrigger value="monsters">Monster List</TabsTrigger>
        </TabsList>

        <TabsContent value="initiative">
          <InitiativeTracker combatants={combatants} onChange={setCombatants} players={players} />
        </TabsContent>

        <TabsContent value="encounters">
          <EncounterBuilder
            monsters={monsters}
            encounters={encounters}
            onChange={setEncounters}
            onSendToTracker={(newCombatants) => setCombatants((prev) => [...prev, ...newCombatants])}
          />
        </TabsContent>

        <TabsContent value="monsters">
          <MonsterList monsters={monsters} onChange={setMonsters} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
