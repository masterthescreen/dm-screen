"use client";

import { Player } from "@/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CharacterSheetViewProps {
  player: Player;
  onChange: (patch: Partial<Player["character"]>) => void;
}

const stats = ["str", "dex", "con", "int", "wis", "cha"] as const;

export function CharacterSheetView({ player, onChange }: CharacterSheetViewProps) {
  const c = player.character;
  const hpPct = c.maxHp > 0 ? Math.max(0, Math.min(100, (c.currentHp / c.maxHp) * 100)) : 0;

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
              className="w-24"
              value={c.currentHp}
              onChange={(e) => onChange({ currentHp: parseInt(e.target.value, 10) || 0 })}
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
          <Textarea rows={3} value={c.equipment} onChange={(e) => onChange({ equipment: e.target.value })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Backstory</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea rows={4} value={c.backstory} onChange={(e) => onChange({ backstory: e.target.value })} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground font-accent italic">
        Your GM controls your class, race, level, AC, max HP, and ability scores. You can update your current HP,
        equipment, and backstory here.
      </p>
    </div>
  );
}
