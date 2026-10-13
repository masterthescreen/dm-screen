"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Player } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, Link2, Loader2, RefreshCw, Unlink } from "lucide-react";

interface Snapshot {
  characterId: string;
  name: string;
  race: string;
  className: string;
  level: number;
  abilities: Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>;
  maxHp: number;
  currentHp: number;
  warnings: string[];
}

interface Change {
  field: string;
  from: string | number;
  to: string | number;
}

interface PanelProps {
  player: Player;
  /** Save any unsaved edits first, so a sync never races with typing. */
  beforeAction: () => Promise<void>;
  onChanged: () => Promise<void>;
}

export function formatWhen(ms: number | null): string {
  if (!ms) return "never";
  return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ChangeList({ changes }: { changes: Change[] }) {
  if (changes.length === 0) return <p className="text-sm text-muted-foreground">Nothing to change. The sheet already matches.</p>;
  return (
    <ul className="text-sm grid gap-1 sm:grid-cols-2">
      {changes.map((c) => (
        <li key={c.field} className="flex items-center justify-between gap-3 rounded border bg-muted/30 px-3 py-1.5">
          <span className="font-medium">{c.field}</span>
          <span className="font-mono text-xs">
            <span className="text-muted-foreground">{String(c.from) || "—"}</span> &rarr;{" "}
            <span className="text-foreground font-semibold">{String(c.to)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** GM tool: link a player to their D&D Beyond character and sync their sheet from it. */
export function DdbPanel({ player, beforeAction, onChanged }: PanelProps) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<null | "preview" | "link" | "sync" | "unlink">(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Change[] | null>(null);
  const [preview, setPreview] = useState<{ snapshot: Snapshot; changes: Change[] } | null>(null);

  const link = player.ddb;
  const msg = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong. Please try again.");

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    setResult(null);
    try {
      await beforeAction();
      await fn();
    } catch (err) {
      setError(msg(err));
    } finally {
      setBusy(null);
    }
  };

  const doPreview = () =>
    run("preview", async () => {
      const res = await api<{ snapshot: Snapshot; changes: Change[] }>(`/api/gm/players/${player.id}/ddb/preview`, {
        method: "POST",
        body: { input },
      });
      setPreview(res);
    });

  const doLink = () =>
    run("link", async () => {
      const res = await api<{ changes: Change[] }>(`/api/gm/players/${player.id}/ddb`, { method: "PUT", body: { input } });
      setPreview(null);
      setInput("");
      setResult(res.changes);
      await onChanged();
    });

  const doSync = () =>
    run("sync", async () => {
      const res = await api<{ changes: Change[] }>(`/api/gm/players/${player.id}/ddb/sync`, { method: "POST" });
      setResult(res.changes);
      await onChanged();
    });

  const doUnlink = () => {
    if (!window.confirm(`Unlink ${player.characterName} from D&D Beyond? Their sheet keeps its current numbers.`)) return;
    void run("unlink", async () => {
      await api(`/api/gm/players/${player.id}/ddb`, { method: "DELETE" });
      await onChanged();
    });
  };

  return (
    <>
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Link {preview?.snapshot.name}?</DialogTitle>
            <DialogDescription>
              This will update {player.characterName}&apos;s sheet from D&amp;D Beyond. Check the numbers look right first.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {preview.snapshot.race || "Unknown race"} {preview.snapshot.className}, level {preview.snapshot.level}
              </p>
              <ChangeList changes={preview.changes} />
              {preview.snapshot.warnings.map((w) => (
                <Alert key={w}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{w}</AlertDescription>
                </Alert>
              ))}
              <p className="text-xs text-muted-foreground">
                Armor class, equipment and backstory are not changed. Set AC yourself on the sheet.
              </p>
              <div className="flex gap-2">
                <Button onClick={doLink} disabled={busy === "link"}>
                  {busy === "link" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Link and update sheet
                </Button>
                <Button variant="outline" onClick={() => setPreview(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5" /> D&amp;D Beyond
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {link ? (
            <>
              <p className="text-sm">
                Linked to <strong>{link.name}</strong> <span className="text-muted-foreground">(#{link.characterId})</span>
                <br />
                <span className="text-xs text-muted-foreground">Last synced {formatWhen(link.lastSyncedAt)}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={doSync} disabled={busy !== null}>
                  {busy === "sync" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                  Sync now
                </Button>
                <Button size="sm" variant="outline" onClick={doUnlink} disabled={busy !== null}>
                  <Unlink className="h-3.5 w-3.5 mr-1.5" /> Unlink
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Syncing refreshes class, race, level, ability scores and max HP. Their current HP is kept (and rises with a
                level-up). Changes you make to those fields by hand are replaced at the next sync.
              </p>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`ddb-${player.id}`} className="text-xs">
                  Their D&amp;D Beyond character link (or number)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`ddb-${player.id}`}
                    placeholder="https://www.dndbeyond.com/characters/12345678"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && input.trim() && void doPreview()}
                  />
                  <Button onClick={doPreview} disabled={!input.trim() || busy !== null}>
                    {busy === "preview" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Preview
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The character must be set to <strong>Public</strong> in D&amp;D Beyond (Settings, then Privacy). You&apos;ll see
                what would change before anything is saved. Once linked, the player can sync it themselves.
              </p>
            </>
          )}
          {result && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <span className="block">{result.length === 0 ? "Synced. Nothing needed changing." : "Synced. These changed:"}</span>
                {result.length > 0 && <ChangeList changes={result} />}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </>
  );
}
