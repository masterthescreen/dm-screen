"use client";

import { useState } from "react";
import { Encounter, Monster, Combatant } from "@/types";
import { uid } from "@/lib/storage";
import { rollDie } from "@/lib/dice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash, Swords } from "lucide-react";

interface EncounterBuilderProps {
  monsters: Monster[];
  encounters: Encounter[];
  onChange: (encounters: Encounter[]) => void;
  onSendToTracker: (combatants: Combatant[]) => void;
}

const difficultyColors: Record<Encounter["difficulty"], string> = {
  trivial: "bg-muted text-muted-foreground",
  easy: "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400",
  medium: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  hard: "bg-orange-600/20 text-orange-700 dark:text-orange-400",
  deadly: "bg-destructive/20 text-destructive",
};

function blankEncounter(): Encounter {
  return {
    id: uid(),
    name: "",
    description: "",
    difficulty: "medium",
    monsterIds: [],
    createdAt: new Date().toISOString(),
  };
}

export function EncounterBuilder({ monsters, encounters, onChange, onSendToTracker }: EncounterBuilderProps) {
  const [draft, setDraft] = useState<Encounter>(blankEncounter());
  const [selectedMonster, setSelectedMonster] = useState<string>("");

  const addMonsterToDraft = () => {
    if (!selectedMonster) return;
    const existing = draft.monsterIds.find((m) => m.monsterId === selectedMonster);
    if (existing) {
      setDraft({
        ...draft,
        monsterIds: draft.monsterIds.map((m) =>
          m.monsterId === selectedMonster ? { ...m, count: m.count + 1 } : m
        ),
      });
    } else {
      setDraft({ ...draft, monsterIds: [...draft.monsterIds, { monsterId: selectedMonster, count: 1 }] });
    }
  };

  const saveEncounter = () => {
    if (!draft.name.trim() || draft.monsterIds.length === 0) return;
    onChange([...encounters, draft]);
    setDraft(blankEncounter());
  };

  const deleteEncounter = (id: string) => onChange(encounters.filter((e) => e.id !== id));

  const sendToTracker = (encounter: Encounter) => {
    const combatants: Combatant[] = [];
    encounter.monsterIds.forEach(({ monsterId, count }) => {
      const monster = monsters.find((m) => m.id === monsterId);
      if (!monster) return;
      for (let i = 0; i < count; i++) {
        combatants.push({
          id: uid(),
          name: count > 1 ? `${monster.name} ${i + 1}` : monster.name,
          kind: "monster",
          initiative: rollDie(20),
          maxHp: monster.hp,
          currentHp: monster.hp,
          ac: monster.ac,
          conditions: [],
          notes: "",
        });
      }
    });
    onSendToTracker(combatants);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="font-display text-lg font-semibold">Build an Encounter</h3>
        <div className="space-y-1.5">
          <Label>Encounter name</Label>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Difficulty</Label>
          <Select value={draft.difficulty} onValueChange={(v) => setDraft({ ...draft, difficulty: v as Encounter["difficulty"] })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trivial">Trivial</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
              <SelectItem value="deadly">Deadly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Add monster</Label>
          <div className="flex gap-2">
            <Select value={selectedMonster} onValueChange={setSelectedMonster}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={monsters.length ? "Choose a monster" : "No monsters catalogued yet"} />
              </SelectTrigger>
              <SelectContent>
                {monsters.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} (CR {m.cr || "?"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={addMonsterToDraft} disabled={!selectedMonster}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {draft.monsterIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {draft.monsterIds.map(({ monsterId, count }) => {
              const monster = monsters.find((m) => m.id === monsterId);
              return (
                <Badge key={monsterId} variant="secondary">
                  {count}x {monster?.name ?? "Unknown"}
                </Badge>
              );
            })}
          </div>
        )}
        <Button onClick={saveEncounter} disabled={!draft.name.trim() || draft.monsterIds.length === 0}>
          Save Encounter
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-lg font-semibold">Saved Encounters</h3>
        {encounters.length === 0 && (
          <p className="text-sm text-muted-foreground italic font-accent">No encounters prepared yet.</p>
        )}
        {encounters.map((enc) => (
          <Card key={enc.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-display">{enc.name}</CardTitle>
                <Badge className={difficultyColors[enc.difficulty]} variant="outline">
                  {enc.difficulty}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteEncounter(enc.id)}>
                <Trash className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {enc.description && <p className="text-sm text-muted-foreground">{enc.description}</p>}
              <div className="flex flex-wrap gap-1.5">
                {enc.monsterIds.map(({ monsterId, count }) => {
                  const monster = monsters.find((m) => m.id === monsterId);
                  return (
                    <Badge key={monsterId} variant="outline">
                      {count}x {monster?.name ?? "Unknown"}
                    </Badge>
                  );
                })}
              </div>
              <Button size="sm" onClick={() => sendToTracker(enc)}>
                <Swords className="h-3.5 w-3.5 mr-1.5" /> Send to Initiative Tracker
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
