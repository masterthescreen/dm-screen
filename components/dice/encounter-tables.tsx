"use client";

import { useEffect, useState } from "react";
import { EncounterTable, EncounterTableEntry } from "@/types";
import { uid } from "@/lib/storage";
import { rollDie } from "@/lib/dice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash, Dices } from "lucide-react";

interface EncounterTablesProps {
  tables: EncounterTable[];
  onChange: (tables: EncounterTable[]) => void;
}

function defaultTables(): EncounterTable[] {
  return [
    {
      id: uid(),
      name: "Forest Road",
      terrain: "Forest",
      diceSize: 20,
      entries: [
        { id: uid(), range: "1-8", result: "No encounter" },
        { id: uid(), range: "9-12", result: "Pack of wolves (2d4)" },
        { id: uid(), range: "13-15", result: "Bandit ambush" },
        { id: uid(), range: "16-18", result: "Traveling merchant caravan" },
        { id: uid(), range: "19-20", result: "Owlbear sighting" },
      ],
    },
  ];
}

function rangeContains(range: string, roll: number): boolean {
  const [a, b] = range.split("-").map((n) => parseInt(n.trim(), 10));
  if (Number.isNaN(b)) return roll === a;
  return roll >= a && roll <= b;
}

export function EncounterTables({ tables, onChange }: EncounterTablesProps) {
  const [activeId, setActiveId] = useState<string | undefined>(tables[0]?.id);
  const [result, setResult] = useState<{ roll: number; text: string } | null>(null);

  useEffect(() => {
    if (tables.length === 0) {
      const seeded = defaultTables();
      onChange(seeded);
      setActiveId(seeded[0]?.id);
    } else if (!activeId || !tables.find((t) => t.id === activeId)) {
      setActiveId(tables[0]?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables]);

  const active = tables.find((t) => t.id === activeId);

  const addTable = () => {
    const t: EncounterTable = { id: uid(), name: "New Table", terrain: "", diceSize: 20, entries: [] };
    onChange([...tables, t]);
    setActiveId(t.id);
  };

  const updateTable = (id: string, patch: Partial<EncounterTable>) => {
    onChange(tables.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const deleteTable = (id: string) => {
    const next = tables.filter((t) => t.id !== id);
    onChange(next);
    setActiveId(next[0]?.id);
  };

  const addEntry = (tableId: string) => {
    const entry: EncounterTableEntry = { id: uid(), range: "", result: "" };
    onChange(tables.map((t) => (t.id === tableId ? { ...t, entries: [...t.entries, entry] } : t)));
  };

  const updateEntry = (tableId: string, entryId: string, patch: Partial<EncounterTableEntry>) => {
    onChange(
      tables.map((t) =>
        t.id === tableId ? { ...t, entries: t.entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)) } : t
      )
    );
  };

  const deleteEntry = (tableId: string, entryId: string) => {
    onChange(tables.map((t) => (t.id === tableId ? { ...t, entries: t.entries.filter((e) => e.id !== entryId) } : t)));
  };

  const rollTable = () => {
    if (!active) return;
    const roll = rollDie(active.diceSize);
    const match = active.entries.find((e) => rangeContains(e.range, roll));
    setResult({ roll, text: match?.result ?? "No matching entry — check your ranges" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold">Encounter Tables</h3>
          <Button variant="outline" size="sm" onClick={addTable}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New
          </Button>
        </div>
        <div className="space-y-1">
          {tables.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm ${
                t.id === activeId ? "bg-primary text-primary-foreground" : "hover:bg-accent/10"
              }`}
            >
              {t.name} <span className="text-xs opacity-70">(d{t.diceSize})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-5">
        {active && (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Table name</label>
                <Input value={active.name} onChange={(e) => updateTable(active.id, { name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Terrain</label>
                <Input value={active.terrain} onChange={(e) => updateTable(active.id, { terrain: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Dice</label>
                <Select value={String(active.diceSize)} onValueChange={(v) => updateTable(active.id, { diceSize: parseInt(v, 10) })}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 6, 8, 10, 12, 20, 100].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        d{d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => deleteTable(active.id)} className="text-destructive">
                <Trash className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {active.entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2">
                  <Input
                    className="w-24"
                    placeholder="1-5"
                    value={entry.range}
                    onChange={(e) => updateEntry(active.id, entry.id, { range: e.target.value })}
                  />
                  <Input
                    className="flex-1"
                    placeholder="Encounter result"
                    value={entry.result}
                    onChange={(e) => updateEntry(active.id, entry.id, { result: e.target.value })}
                  />
                  <Button variant="ghost" size="sm" onClick={() => deleteEntry(active.id, entry.id)}>
                    <Trash className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addEntry(active.id)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add row
              </Button>
            </div>

            <Button onClick={rollTable} className="w-full">
              <Dices className="h-4 w-4 mr-1.5" /> Roll on {active.name}
            </Button>

            {result && (
              <Card className="border-accent/50 bg-accent/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-normal">
                    Rolled a {result.roll} on d{active.diceSize}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-display text-xl font-semibold">{result.text}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
