"use client";

import { useState } from "react";
import { Player, Note } from "@/types";
import { blankPlayer } from "@/lib/player-data";
import { uid } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash, Mail, KeyRound } from "lucide-react";

function generatePasscode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

interface PlayerManagerProps {
  players: Player[];
  onChange: (players: Player[]) => void;
}

export function PlayerManager({ players, onChange }: PlayerManagerProps) {
  const [activeId, setActiveId] = useState<string | undefined>(players[0]?.id);
  const [draft, setDraft] = useState(blankPlayer());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState({ title: "", content: "" });

  const active = players.find((p) => p.id === activeId) ?? players[0];

  const addPlayer = () => {
    if (!draft.playerName.trim()) return;
    const p: Player = { ...draft, characterName: draft.characterName.trim() || "Unnamed" };
    onChange([...players, p]);
    setActiveId(p.id);
    setDraft(blankPlayer());
    setDialogOpen(false);
  };

  const removePlayer = (id: string) => {
    const next = players.filter((p) => p.id !== id);
    onChange(next);
    setActiveId(next[0]?.id);
  };

  const updateActive = (patch: Partial<Player>) => {
    if (!active) return;
    onChange(players.map((p) => (p.id === active.id ? { ...p, ...patch } : p)));
  };

  const updateCharacter = (patch: Partial<Player["character"]>) => {
    if (!active) return;
    onChange(players.map((p) => (p.id === active.id ? { ...p, character: { ...p.character, ...patch } } : p)));
  };

  const addPlayerNote = () => {
    if (!active || !noteDraft.title.trim()) return;
    const note: Note = { id: uid(), title: noteDraft.title, content: noteDraft.content, createdAt: new Date().toISOString() };
    onChange(players.map((p) => (p.id === active.id ? { ...p, notes: [note, ...p.notes] } : p)));
    setNoteDraft({ title: "", content: "" });
  };

  const removeNote = (playerId: string, noteId: string) => {
    onChange(players.map((p) => (p.id === playerId ? { ...p, notes: p.notes.filter((n) => n.id !== noteId) } : p)));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold">Players</h3>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setDraft(blankPlayer())}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">New Player</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Player name</Label>
                  <Input value={draft.playerName} onChange={(e) => setDraft({ ...draft, playerName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Character name</Label>
                  <Input
                    value={draft.characterName}
                    onChange={(e) => setDraft({ ...draft, characterName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Login passcode (optional)</Label>
                  <div className="flex gap-2">
                    <Input value={draft.passcode} onChange={(e) => setDraft({ ...draft, passcode: e.target.value })} />
                    <Button type="button" variant="outline" onClick={() => setDraft({ ...draft, passcode: generatePasscode() })}>
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Tell your player this passcode so they can log in.</p>
                </div>
                <Button onClick={addPlayer} disabled={!draft.playerName.trim()}>
                  Create Player
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-1">
          {players.length === 0 && <p className="text-sm text-muted-foreground italic font-accent">No players yet.</p>}
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${
                p.id === activeId ? "bg-primary text-primary-foreground" : "hover:bg-accent/10"
              }`}
            >
              <span>
                {p.characterName} <span className="text-xs opacity-70">({p.playerName})</span>
              </span>
              {p.notes.some((n) => n.fromGM) && <Mail className="h-3 w-3 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-5">
        {active ? (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">
                {active.characterName}
                <span className="text-sm text-muted-foreground font-normal ml-2">played by {active.playerName}</span>
              </h3>
              <Button variant="ghost" size="sm" onClick={() => removePlayer(active.id)} className="text-destructive">
                <Trash className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5" /> Account
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Player name</Label>
                  <Input value={active.playerName} onChange={(e) => updateActive({ playerName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Character name</Label>
                  <Input value={active.characterName} onChange={(e) => updateActive({ characterName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Login passcode</Label>
                  <Input value={active.passcode} onChange={(e) => updateActive({ passcode: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-display">Character Sheet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Class</Label>
                    <Input value={active.character.className} onChange={(e) => updateCharacter({ className: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Race</Label>
                    <Input value={active.character.race} onChange={(e) => updateCharacter({ race: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Level</Label>
                    <Input
                      type="number"
                      value={active.character.level}
                      onChange={(e) => updateCharacter({ level: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">AC</Label>
                    <Input
                      type="number"
                      value={active.character.ac}
                      onChange={(e) => updateCharacter({ ac: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max HP</Label>
                    <Input
                      type="number"
                      value={active.character.maxHp}
                      onChange={(e) => updateCharacter({ maxHp: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Current HP</Label>
                    <Input
                      type="number"
                      value={active.character.currentHp}
                      onChange={(e) => updateCharacter({ currentHp: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {(["str", "dex", "con", "int", "wis", "cha"] as const).map((stat) => (
                    <div key={stat} className="space-y-1">
                      <Label className="text-xs uppercase">{stat}</Label>
                      <Input
                        type="number"
                        value={active.character[stat]}
                        onChange={(e) => updateCharacter({ [stat]: parseInt(e.target.value, 10) || 0 })}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Equipment</Label>
                  <Textarea rows={2} value={active.character.equipment} onChange={(e) => updateCharacter({ equipment: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Backstory</Label>
                  <Textarea rows={2} value={active.character.backstory} onChange={(e) => updateCharacter({ backstory: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2 p-4 border rounded-md bg-card/50">
              <Label className="text-xs text-muted-foreground">Add a note directly to this player&apos;s notebook</Label>
              <Input
                placeholder="Note title"
                value={noteDraft.title}
                onChange={(e) => setNoteDraft({ ...noteDraft, title: e.target.value })}
              />
              <Textarea
                rows={2}
                placeholder="What should they remember?"
                value={noteDraft.content}
                onChange={(e) => setNoteDraft({ ...noteDraft, content: e.target.value })}
              />
              <Button size="sm" onClick={addPlayerNote} disabled={!noteDraft.title.trim()}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Note
              </Button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-ornate pr-1">
              {active.notes.length === 0 && (
                <p className="text-sm text-muted-foreground italic font-accent">This notebook is empty.</p>
              )}
              {active.notes.map((note) => (
                <Card key={note.id} className={note.fromGM ? "border-accent/60 bg-accent/5" : undefined}>
                  <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-display">{note.title}</CardTitle>
                      {note.fromGM && (
                        <Badge variant="outline" className="text-[10px] border-accent text-accent">
                          From GM
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeNote(active.id, note.id)}>
                      <Trash className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic font-accent">Add a player to begin their notebook.</p>
        )}
      </div>
    </div>
  );
}
