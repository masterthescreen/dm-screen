"use client";

import { useEffect, useState } from "react";
import { Player } from "@/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CharacterSheetViewProps {
  player: Player;
  // Saves one of the fields a player may edit themselves.
  onSave: (patch: { currentHp?: number; equipment?: string; backstory?: string }) => Promise<void>;
}

const stats = ["str", "dex", "con", "int", "wis", "cha"] as const;

export function CharacterSheetView({ player, onSave }: CharacterSheetViewProps) {
  const c = player.character;

  // Edit locally, save when the field loses focus, so live updates don't fight typing.
  const [hp, setHp] = useState(String(c.currentHp));
  const [equipment, setEquipment] = useState(c.equipment);
  const [backstory, setBackstory] = useState(c.backstory);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    if (editing !== "hp") setHp(String(c.currentHp));
    if (editing !== "equipment") setEquipment(c.equipment);
    if (editing !== "backstory") setBackstory(c.backstory);
  }, [c.currentHp, c.equipment, c.backstory, editing]);

  const hpNum = parseInt(hp, 10);
  const shownHp = Number.isFinite(hpNum) ? hpNum : c.currentHp;
  const hpPct = c.maxHp > 0 ? Math.max(0, Math.min(100, (shownHp / c.maxHp) * 100)) : 0;

  const commit = async (patch: Parameters<CharacterSheetViewProps["onSave"]>[0]) => {
    setEditing(null);
    await onSave(patch);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">
            {c.race || "Unknown race"} {c.className || "Adventurer"} &middot; Level {c.level}
          </p>
          <h2 className="font-display text-3xl font-bold">{player.characterName}</h2>
          <p className="text-sm text-muted-foreground">Played by {player.playerName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Armor Class</p>
          <p className="font-display text-3xl font-bold text-primary">{c.ac}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Hit Points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${hpPct > 50 ? "bg-emerald-600" : hpPct > 20 ? "bg-amber-500" : "bg-destructive"}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              aria-label="Current HP"
              className="w-24"
              value={hp}
              onFocus={() => setEditing("hp")}
              onChange={(e) => setHp(e.target.value)}
              onBlur={() => void commit({ currentHp: Number.isFinite(hpNum) ? hpNum : c.currentHp })}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
            <span className="text-sm text-muted-foreground">/ {c.maxHp} HP</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {stats.map((stat) => (
          <Card key={stat}>
            <CardContent className="p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat}</p>
              <p className="font-display text-2xl font-bold">{c[stat]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Equipment</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            aria-label="Equipment"
            value={equipment}
            onFocus={() => setEditing("equipment")}
            onChange={(e) => setEquipment(e.target.value)}
            onBlur={() => void commit({ equipment })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Backstory</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            aria-label="Backstory"
            value={backstory}
            onFocus={() => setEditing("backstory")}
            onChange={(e) => setBackstory(e.target.value)}
            onBlur={() => void commit({ backstory })}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground font-accent italic">
        Your GM controls your class, race, level, AC, max HP, and ability scores. You can update your current HP,
        equipment, and backstory here. Changes save when you click away.
      </p>
    </div>
  );
}
