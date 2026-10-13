"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Player } from "@/types";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ChangeList, formatWhen } from "@/components/players/ddb-panel";
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";

interface Change {
  field: string;
  from: string | number;
  to: string | number;
}

/** Player view: sync your own sheet from the D&D Beyond character your GM linked. */
export function DdbSyncCard({ player, onSynced }: { player: Player; onSynced: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<Change[] | null>(null);

  if (!player.ddb) return null;

  const sync = async () => {
    setBusy(true);
    setError(null);
    setChanges(null);
    try {
      const res = await api<{ changes: Change[] }>("/api/me/ddb/sync", { method: "POST" });
      setChanges(res.changes);
      await onSynced();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-5">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            Synced with <strong>{player.ddb.name}</strong> on D&amp;D Beyond
            <br />
            <span className="text-xs text-muted-foreground">Last synced {formatWhen(player.ddb.lastSyncedAt)}</span>
          </p>
          <Button size="sm" variant="outline" onClick={sync} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Sync now
          </Button>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {changes && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <span className="block">{changes.length === 0 ? "Already up to date." : "Updated from D&D Beyond:"}</span>
              {changes.length > 0 && <ChangeList changes={changes} />}
            </AlertDescription>
          </Alert>
        )}
        <p className="text-xs text-muted-foreground">
          Make your D&amp;D Beyond character changes first, then sync here. Class, race, level, ability scores and max HP
          update. Armor class is set by your GM.
        </p>
      </CardContent>
    </Card>
  );
}
