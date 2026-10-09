"use client";

import { useMemo, useState } from "react";
import { Combatant, Player } from "@/types";
import { uid } from "@/lib/storage";
import { rollDie } from "@/lib/dice";
import { CONDITIONS } from "@/lib/conditions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Plus, Trash, RefreshCw, ChevronRight, Shield, Heart, Users, X } from "lucide-react";

interface InitiativeTrackerProps {
  combatants: Combatant[];
  onChange: (combatants: Combatant[]) => void;
  players: Player[];
}

export function InitiativeTracker({ combatants, onChange, players }: InitiativeTrackerProps) {
  const [round, setRound] = useState(1);
  const [turnIndex, setTurnIndex] = useState(0);
  const [newName, setNewName] = useState("");

  const sorted = useMemo(() => [...combatants].sort((a, b) => b.initiative - a.initiative), [combatants]);
  const safeTurn = sorted.length === 0 ? 0 : Math.min(turnIndex, sorted.length - 1);

  const missingPlayers = players.filter((p) => !combatants.some((c) => c.playerId === p.id));

  const addCombatant = () => {
    if (!newName.trim()) return;
    onChange([
      ...combatants,
      {
        id: uid(),
        name: newName.trim(),
        kind: "pc",
        initiative: rollDie(20),
        maxHp: 10,
        currentHp: 10,
        ac: 10,
        conditions: [],
        notes: "",
      },
    ]);
    setNewName("");
  };

  const addParty = () => {
    const added: Combatant[] = missingPlayers.map((p) => ({
      id: uid(),
      playerId: p.id,
      name: p.characterName || p.playerName,
      kind: "pc" as const,
      initiative: rollDie(20),
      maxHp: p.character.maxHp,
      currentHp: p.character.currentHp,
      ac: p.character.ac,
      conditions: [],
      notes: "",
    }));
    onChange([...combatants, ...added]);
  };

  const updateCombatant = (id: string, patch: Partial<Combatant>) => {
    onChange(combatants.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const addCondition = (id: string, condition: string) => {
    const target = combatants.find((c) => c.id === id);
    if (!target || (target.conditions ?? []).includes(condition)) return;
    updateCombatant(id, { conditions: [...(target.conditions ?? []), condition] });
  };

  const removeCondition = (id: string, condition: string) => {
    const target = combatants.find((c) => c.id === id);
    if (!target) return;
    updateCombatant(id, { conditions: (target.conditions ?? []).filter((c) => c !== condition) });
  };

  const removeCombatant = (id: string) => onChange(combatants.filter((c) => c.id !== id));

  const rerollAll = () => {
    onChange(combatants.map((c) => ({ ...c, initiative: rollDie(20) })));
  };

  const nextTurn = () => {
    if (sorted.length === 0) return;
    const next = safeTurn + 1;
    if (next >= sorted.length) {
      setTurnIndex(0);
      setRound((r) => r + 1);
    } else {
      setTurnIndex(next);
    }
  };

  const resetEncounter = () => {
    onChange([]);
    setRound(1);
    setTurnIndex(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Initiative Order</h3>
          <p className="text-xs text-muted-foreground">
            Round {round} {sorted.length > 0 && `— ${sorted[safeTurn]?.name}'s turn`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={addParty} disabled={missingPlayers.length === 0}>
            <Users className="h-3.5 w-3.5 mr-1.5" /> Add Party{missingPlayers.length > 0 ? ` (${missingPlayers.length})` : ""}
          </Button>
          <Button variant="outline" size="sm" onClick={rerollAll} disabled={combatants.length === 0}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reroll All
          </Button>
          <Button size="sm" onClick={nextTurn} disabled={sorted.length === 0}>
            Next Turn <ChevronRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={resetEncounter} className="text-destructive">
            <Trash className="h-3.5 w-3.5 mr-1.5" /> Clear
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add a combatant by name (ad-hoc PC or NPC)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCombatant()}
        />
        <Button variant="outline" onClick={addCombatant} aria-label="Add combatant">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground italic font-accent py-6 text-center">
            No combatants yet. Add your party, send an encounter here from the builder, or add one by name.
          </p>
        )}
        {sorted.map((c, idx) => {
          const isActive = idx === safeTurn;
          const hpPct = c.maxHp > 0 ? Math.max(0, Math.min(100, (c.currentHp / c.maxHp) * 100)) : 0;
          const conditions = c.conditions ?? [];
          return (
            <div
              key={c.id}
              className={cn(
                "rounded-md border p-3 transition-colors space-y-2",
                isActive ? "border-accent bg-accent/10 shadow-sm" : "border-border bg-card"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center w-14 shrink-0">
                  <span className="text-xs text-muted-foreground">INIT</span>
                  <Input
                    type="number"
                    value={c.initiative}
                    onChange={(e) => updateCombatant(c.id, { initiative: parseInt(e.target.value, 10) || 0 })}
                    className="w-14 h-8 text-center font-bold"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{c.name}</span>
                    <Badge variant={c.kind === "pc" ? "secondary" : "outline"} className="text-[10px]">
                      {c.kind === "pc" ? "PC" : "Monster"}
                    </Badge>
                  </div>
                  <div className="h-1.5 w-full max-w-xs bg-muted rounded-full overflow-hidden mt-1.5">
                    <div
                      className={cn("h-full rounded-full", hpPct > 50 ? "bg-emerald-600" : hpPct > 20 ? "bg-amber-500" : "bg-destructive")}
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Heart className="h-3.5 w-3.5 text-destructive" />
                  <Input
                    type="number"
                    value={c.currentHp}
                    onChange={(e) => updateCombatant(c.id, { currentHp: parseInt(e.target.value, 10) || 0 })}
                    className="w-16 h-8 text-center"
                  />
                  <span className="text-xs text-muted-foreground">/ {c.maxHp}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    value={c.ac}
                    onChange={(e) => updateCombatant(c.id, { ac: parseInt(e.target.value, 10) || 0 })}
                    className="w-14 h-8 text-center"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeCombatant(c.id)} aria-label={`Remove ${c.name}`}>
                  <Trash className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pl-[68px]">
                {conditions.map((cond) => (
                  <Badge
                    key={cond}
                    className="bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 gap-1 pr-1"
                    variant="outline"
                  >
                    {cond}
                    <button
                      onClick={() => removeCondition(c.id, cond)}
                      aria-label={`Remove ${cond} from ${c.name}`}
                      className="rounded-full hover:bg-primary/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs" aria-label={`Edit conditions for ${c.name}`}>
                      <Plus className="h-3 w-3 mr-1" /> Condition
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3" align="start">
                    <p className="text-xs text-muted-foreground mb-2">Tap to apply or remove for {c.name}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CONDITIONS.map((cond) => {
                        const on = conditions.includes(cond);
                        return (
                          <button
                            key={cond}
                            type="button"
                            aria-pressed={on}
                            onClick={() => (on ? removeCondition(c.id, cond) : addCondition(c.id, cond))}
                            className={cn(
                              "rounded border px-2 py-1.5 text-xs text-left transition-colors",
                              on
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card hover:bg-accent/10 border-border"
                            )}
                          >
                            {cond}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
