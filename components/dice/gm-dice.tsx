"use client";

import { useState } from "react";
import { RollRecord } from "@/types";
import { uid } from "@/lib/storage";
import { rollFormula } from "@/lib/dice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dices, Trash } from "lucide-react";
import { cn } from "@/lib/utils";

interface GMDiceProps {
  history: RollRecord[];
  onChange: (history: RollRecord[]) => void;
}

const quickDice = [4, 6, 8, 10, 12, 20, 100];

export function GMDice({ history, onChange }: GMDiceProps) {
  const [formula, setFormula] = useState("1d20");
  const [label, setLabel] = useState("");
  const [lastRoll, setLastRoll] = useState<RollRecord | null>(null);

  const commitRoll = (f: string, lbl: string) => {
    const result = rollFormula(f);
    const record: RollRecord = {
      id: uid(),
      label: lbl || f,
      formula: f,
      rolls: result.rolls,
      modifier: result.modifier,
      total: result.total,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLastRoll(record);
    onChange([record, ...history].slice(0, 50));
  };

  const rollQuick = (sides: number) => commitRoll(`1d${sides}`, `d${sides}`);

  const clearHistory = () => onChange([]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-5">
        <div className="flex flex-wrap gap-2">
          {quickDice.map((sides) => (
            <Button key={sides} variant="outline" onClick={() => rollQuick(sides)} className="font-display">
              d{sides}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Custom formula e.g. 2d6+3"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            className="font-mono"
          />
          <Input placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} className="max-w-[160px]" />
          <Button onClick={() => commitRoll(formula, label)}>
            <Dices className="h-4 w-4 mr-1.5" /> Roll
          </Button>
        </div>

        {lastRoll && (
          <Card className="border-accent/50 bg-accent/5">
            <CardContent className="p-6 text-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{lastRoll.label}</p>
              <p className="font-display text-6xl font-black text-accent mt-2">{lastRoll.total}</p>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                [{lastRoll.rolls.join(", ")}] {lastRoll.modifier !== 0 && (lastRoll.modifier > 0 ? `+ ${lastRoll.modifier}` : `- ${Math.abs(lastRoll.modifier)}`)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold">Roll History</h3>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearHistory}>
              <Trash className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto scrollbar-ornate pr-1">
          {history.length === 0 && <p className="text-sm text-muted-foreground italic font-accent">No rolls yet.</p>}
          {history.map((r) => (
            <div key={r.id} className={cn("flex items-center justify-between rounded border border-border/60 px-3 py-2 text-sm bg-card/50")}>
              <div>
                <span className="font-medium">{r.label}</span>
                <span className="text-xs text-muted-foreground ml-2 font-mono">{r.formula}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{r.timestamp}</span>
                <span className="font-display font-bold text-accent w-8 text-right">{r.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
