"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Player } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface AccountViewProps {
  player: Player;
  onChanged: () => Promise<void>;
}

export function AccountView({ player, onChanged }: AccountViewProps) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    setDone(false);
    if (next !== confirm) return setError("The new passwords don't match.");
    setBusy(true);
    try {
      await api("/api/me/password", { method: "PUT", body: { current, next } });
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 max-w-md">
      <div>
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="font-mono text-lg">{player.username}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display">Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pw-current">{player.mustChangePassword ? "Temporary password from your GM" : "Current password"}</Label>
            <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-new">New password (8+ characters)</Label>
            <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm">Confirm new password</Label>
            <Input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {done && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Password changed. Any other devices were signed out.</AlertDescription>
            </Alert>
          )}
          <Button onClick={() => void submit()} disabled={busy || !current || !next || !confirm}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Change password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
