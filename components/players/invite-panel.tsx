"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Copy, Link2, AlertCircle, Ticket } from "lucide-react";

interface InviteStatus {
  active: boolean;
  expiresAt: number | null;
}

interface IssuedInvite {
  code: string;
  expiresAt: number;
}

function formatExpiry(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** GM tool: create the invite code players use to make their own accounts. */
export function InvitePanel() {
  const [status, setStatus] = useState<InviteStatus | null>(null);
  const [issued, setIssued] = useState<IssuedInvite | null>(null);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await api<InviteStatus>("/api/gm/invite"));
    } catch {
      setStatus({ active: false, expiresAt: null });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const message = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong.");

  const create = async () => {
    if (status?.active && !window.confirm("Create a new invite? The current code will stop working right away.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<IssuedInvite>("/api/gm/invite", { method: "POST", body: { days } });
      setCopied(null);
      setIssued(res);
      await refresh();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!window.confirm("Turn off the invite? Nobody new will be able to sign up until you create another.")) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/gm/invite", { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const link = issued && typeof window !== "undefined" ? `${window.location.origin}/login?invite=${issued.code}` : "";

  const copy = async (what: "code" | "link") => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(what === "code" ? issued.code : link);
      setCopied(what);
    } catch {
      setCopied(null);
    }
  };

  return (
    <>
      <Dialog open={!!issued} onOpenChange={(open) => !open && setIssued(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Invite created</DialogTitle>
            <DialogDescription>
              Share this with your players. They enter it on the sign-in page to create their own account. It works until{" "}
              {issued ? formatExpiry(issued.expiresAt) : ""} or until you turn it off. It&apos;s shown only once; if you lose
              it, create a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-muted px-4 py-3 text-center font-mono text-2xl tracking-widest">
                {issued?.code}
              </code>
              <Button variant="outline" onClick={() => copy("code")} aria-label="Copy invite code">
                {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground font-mono">
                {link}
              </div>
              <Button variant="outline" onClick={() => copy("link")} aria-label="Copy invite link">
                {copied === "link" ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button onClick={() => setIssued(null)}>I&apos;ve shared it</Button>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Ticket className="h-4 w-4 text-accent" /> Player invite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-muted-foreground">
            {status === null
              ? "Checking…"
              : status.active && status.expiresAt
              ? `An invite is active until ${formatExpiry(status.expiresAt)}. Players with the code can create their own account.`
              : "No active invite. Create one so your players can sign themselves up."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted-foreground" htmlFor="invite-days">
              Valid for
            </label>
            <select
              id="invite-days"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value={1}>1 day</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
            </select>
            <Button size="sm" onClick={create} disabled={busy}>
              {status?.active ? "Create new invite" : "Create invite"}
            </Button>
            {status?.active && (
              <Button size="sm" variant="outline" onClick={revoke} disabled={busy} className="text-destructive">
                Turn off
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
