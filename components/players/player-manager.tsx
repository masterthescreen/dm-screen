"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CharacterSheet, Player } from "@/types";
import { PlayerPatch, usePlayers } from "@/lib/use-players";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash, Mail, KeyRound, Copy, Check, AlertCircle, RefreshCw } from "lucide-react";

interface IssuedCode {
  playerName: string;
  characterName: string;
  code: string;
  reset: boolean;
}

type Actions = Pick<ReturnType<typeof usePlayers>, "create" | "patch" | "remove" | "resetCode" | "sendNote" | "deleteNote">;

interface PlayerManagerProps {
  players: Player[];
  actions: Actions;
}

interface Draft {
  playerName: string;
  characterName: string;
  character: CharacterSheet;
}

const SAVE_DELAY_MS = 700;

export function PlayerManager({ players, actions }: PlayerManagerProps) {
  const [activeId, setActiveId] = useState<string | undefined>(players[0]?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ playerName: "", characterName: "" });
  const [issued, setIssued] = useState<IssuedCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState({ title: "", content: "" });

  const active = players.find((p) => p.id === activeId) ?? players[0];

  // ---- Draft editing: edits show instantly, save shortly after, and only the changed fields are sent ----
  const [draft, setDraft] = useState<Draft | null>(null);
  const pending = useRef<{ id: string; body: PlayerPatch } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionsRef = useRef(actions); // the actions object is rebuilt each render; keep flush stable
  actionsRef.current = actions;

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    try {
      await actionsRef.current.patch(job.id, job.body);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    }
  }, []);

  // Adopt server values whenever there are no unsaved local edits.
  useEffect(() => {
    if (!active) {
      setDraft(null);
      return;
    }
    if (!pending.current) {
      setDraft({ playerName: active.playerName, characterName: active.characterName, character: active.character });
    }
  }, [active]);

  // Save anything outstanding when leaving the page.
  useEffect(() => () => void flush(), [flush]);

  const edit = (patch: { playerName?: string; characterName?: string; character?: Partial<CharacterSheet> }) => {
    if (!active) return;
    setDraft((d) => (d ? { ...d, ...patch, character: { ...d.character, ...(patch.character ?? {}) } } : d));
    const current = pending.current && pending.current.id === active.id ? pending.current.body : {};
    pending.current = {
      id: active.id,
      body: { ...current, ...patch, character: { ...(current.character ?? {}), ...(patch.character ?? {}) } },
    };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  };

  const selectPlayer = async (id: string) => {
    await flush();
    setActiveId(id);
    setNoteDraft({ title: "", content: "" });
  };

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  const addPlayer = () =>
    run(async () => {
      const res = await actions.create(newPlayer.playerName, newPlayer.characterName);
      setActiveId(res.player.id);
      setNewPlayer({ playerName: "", characterName: "" });
      setDialogOpen(false);
      setCopied(false);
      setIssued({ playerName: res.player.playerName, characterName: res.player.characterName, code: res.code, reset: false });
    });

  const resetCode = () =>
    run(async () => {
      if (!active) return;
      if (!window.confirm(`Issue a new code for ${active.characterName}? Their current code and any signed-in session stop working.`)) return;
      const code = await actions.resetCode(active.id);
      setCopied(false);
      setIssued({ playerName: active.playerName, characterName: active.characterName, code, reset: true });
    });

  const removePlayer = () =>
    run(async () => {
      if (!active) return;
      if (!window.confirm(`Delete ${active.characterName} and their notebook? This can't be undone.`)) return;
      pending.current = null;
      const remaining = players.filter((p) => p.id !== active.id);
      await actions.remove(active.id);
      setActiveId(remaining[0]?.id);
    });

  const addNote = () =>
    run(async () => {
      if (!active || !noteDraft.title.trim()) return;
      await actions.sendNote(active.id, noteDraft.title, noteDraft.content);
      setNoteDraft({ title: "", content: "" });
    });

  const copyCode = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const c = draft?.character;
  const num = (field: keyof CharacterSheet) => (e: React.ChangeEvent<HTMLInputElement>) =>
    edit({ character: { [field]: parseInt(e.target.value, 10) || 0 } as Partial<CharacterSheet> });
  const txt = (field: keyof CharacterSheet) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    edit({ character: { [field]: e.target.value } as Partial<CharacterSheet> });

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* One-time code display */}
      <Dialog open={!!issued} onOpenChange={(open) => !open && setIssued(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{issued?.reset ? "New player code" : "Player created"}</DialogTitle>
            <DialogDescription>
              Give this code to {issued?.playerName} so they can sign in as {issued?.characterName}. It&apos;s shown only
              once and can&apos;t be looked up later. If it&apos;s lost, reset it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted px-4 py-3 text-center font-mono text-2xl tracking-widest">
              {issued?.code}
            </code>
            <Button variant="outline" onClick={copyCode} aria-label="Copy code">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button onClick={() => setIssued(null)}>I&apos;ve saved it</Button>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Players</h3>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">New Player</DialogTitle>
                  <DialogDescription>A sign-in code is generated for them when you create the player.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="np-player">Player name</Label>
                    <Input
                      id="np-player"
                      value={newPlayer.playerName}
                      onChange={(e) => setNewPlayer({ ...newPlayer, playerName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="np-char">Character name</Label>
                    <Input
                      id="np-char"
                      value={newPlayer.characterName}
                      onChange={(e) => setNewPlayer({ ...newPlayer, characterName: e.target.value })}
                    />
                  </div>
                  <Button onClick={addPlayer} disabled={!newPlayer.playerName.trim()}>
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
                onClick={() => void selectPlayer(p.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${
                  p.id === active?.id ? "bg-primary text-primary-foreground" : "hover:bg-accent/10"
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
          {active && draft && c ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">
                  {draft.characterName}
                  <span className="text-sm text-muted-foreground font-normal ml-2">played by {draft.playerName}</span>
                </h3>
                <Button variant="ghost" size="sm" onClick={removePlayer} className="text-destructive" aria-label="Delete player">
                  <Trash className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5" /> Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Player name</Label>
                      <Input value={draft.playerName} onChange={(e) => edit({ playerName: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Character name</Label>
                      <Input value={draft.characterName} onChange={(e) => edit({ characterName: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      Sign-in code: <span className="font-mono">••••-••••</span> (hidden for security)
                    </p>
                    <Button variant="outline" size="sm" onClick={resetCode}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reset code
                    </Button>
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
                      <Input value={c.className} onChange={txt("className")} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Race</Label>
                      <Input value={c.race} onChange={txt("race")} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Level</Label>
                      <Input type="number" value={c.level} onChange={num("level")} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">AC</Label>
                      <Input type="number" value={c.ac} onChange={num("ac")} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max HP</Label>
                      <Input type="number" value={c.maxHp} onChange={num("maxHp")} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Current HP</Label>
                      <Input type="number" value={c.currentHp} onChange={num("currentHp")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {(["str", "dex", "con", "int", "wis", "cha"] as const).map((stat) => (
                      <div key={stat} className="space-y-1">
                        <Label className="text-xs uppercase">{stat}</Label>
                        <Input type="number" value={c[stat]} onChange={num(stat)} />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Equipment</Label>
                    <Textarea rows={2} value={c.equipment} onChange={txt("equipment")} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Backstory</Label>
                    <Textarea rows={2} value={c.backstory} onChange={txt("backstory")} />
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
                <Button size="sm" onClick={addNote} disabled={!noteDraft.title.trim()}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Send Note
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void run(() => actions.deleteNote(active.id, note.id))}
                        aria-label={`Delete note ${note.title}`}
                      >
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
    </div>
  );
}
