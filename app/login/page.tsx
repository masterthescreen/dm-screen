"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useMe } from "@/components/me-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Crown, User, AlertCircle, Loader2 } from "lucide-react";

interface AuthStatus {
  gmConfigured: boolean;
  setupAvailable: boolean;
  setupCodeRequired: boolean;
  role: "gm" | "player" | null;
}

export default function LoginPage() {
  const router = useRouter();
  const { me, loaded, refresh } = useMe();
  const [status, setStatus] = useState<AuthStatus | null>(null);

  const [gmPasscode, setGmPasscode] = useState("");
  const [gmConfirm, setGmConfirm] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [gmError, setGmError] = useState<string | null>(null);
  const [gmBusy, setGmBusy] = useState(false);

  const [playerCode, setPlayerCode] = useState("");
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [playerBusy, setPlayerBusy] = useState(false);

  useEffect(() => {
    api<AuthStatus>("/api/auth/status")
      .then(setStatus)
      .catch(() => setStatus({ gmConfigured: false, setupAvailable: false, setupCodeRequired: false, role: null }));
  }, []);

  useEffect(() => {
    if (loaded && me) router.replace(me.role === "gm" ? "/" : "/player");
  }, [loaded, me, router]);

  const finish = useCallback(
    async (role: "gm" | "player") => {
      await refresh();
      router.replace(role === "gm" ? "/" : "/player");
    },
    [refresh, router]
  );

  if (!status || !loaded || me) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const message = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong. Please try again.");

  const submitGm = async () => {
    setGmError(null);
    if (!status.gmConfigured) {
      if (gmPasscode.length < 8) return setGmError("Choose a passcode of at least 8 characters.");
      if (gmPasscode !== gmConfirm) return setGmError("Passcodes don't match.");
    }
    setGmBusy(true);
    try {
      if (status.gmConfigured) {
        await api("/api/auth/login", { method: "POST", body: { type: "gm", passcode: gmPasscode } });
      } else {
        await api("/api/auth/setup", { method: "POST", body: { passcode: gmPasscode, setupCode } });
      }
      await finish("gm");
    } catch (err) {
      setGmError(message(err));
    } finally {
      setGmBusy(false);
    }
  };

  const submitPlayer = async () => {
    setPlayerError(null);
    if (!playerCode.trim()) return setPlayerError("Enter the code your GM gave you.");
    setPlayerBusy(true);
    try {
      await api("/api/auth/login", { method: "POST", body: { type: "player", code: playerCode } });
      await finish("player");
    } catch (err) {
      setPlayerError(message(err));
    } finally {
      setPlayerBusy(false);
    }
  };

  const firstRun = !status.gmConfigured;

  return (
    <div className="min-h-screen flex items-center justify-center parchment-texture p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-primary">Codex</h1>
          <p className="font-accent italic text-muted-foreground mt-1">the GM&apos;s companion</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-accent" />
                <CardTitle className="font-display">Game Master</CardTitle>
              </div>
              <CardDescription>
                {firstRun
                  ? status.setupAvailable
                    ? "First time here — create your GM passcode."
                    : "This site hasn't been set up yet."
                  : "Enter your passcode to open the full toolkit."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {firstRun && !status.setupAvailable ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The site owner needs to set the <code>GM_SETUP_CODE</code> setting on the server before the GM account can
                    be created.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {firstRun && status.setupCodeRequired && (
                    <div className="space-y-1.5">
                      <Label htmlFor="setup-code">Setup code</Label>
                      <Input
                        id="setup-code"
                        type="password"
                        autoComplete="off"
                        value={setupCode}
                        onChange={(e) => setSetupCode(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="gm-passcode">{firstRun ? "New passcode (8+ characters)" : "Passcode"}</Label>
                    <Input
                      id="gm-passcode"
                      type="password"
                      autoComplete={firstRun ? "new-password" : "current-password"}
                      value={gmPasscode}
                      onChange={(e) => setGmPasscode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !firstRun && submitGm()}
                    />
                  </div>
                  {firstRun && (
                    <div className="space-y-1.5">
                      <Label htmlFor="gm-confirm">Confirm passcode</Label>
                      <Input
                        id="gm-confirm"
                        type="password"
                        autoComplete="new-password"
                        value={gmConfirm}
                        onChange={(e) => setGmConfirm(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitGm()}
                      />
                    </div>
                  )}
                  {gmError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{gmError}</AlertDescription>
                    </Alert>
                  )}
                  <Button className="w-full" onClick={submitGm} disabled={gmBusy}>
                    {gmBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {firstRun ? "Create Passcode & Enter" : "Enter as Game Master"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-accent" />
                <CardTitle className="font-display">Player</CardTitle>
              </div>
              <CardDescription>Enter the player code your GM gave you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="player-code">Player code</Label>
                <Input
                  id="player-code"
                  placeholder="XXXX-XXXX"
                  autoComplete="off"
                  autoCapitalize="characters"
                  className="font-mono tracking-widest"
                  value={playerCode}
                  onChange={(e) => setPlayerCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitPlayer()}
                />
              </div>
              {playerError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{playerError}</AlertDescription>
                </Alert>
              )}
              <Button className="w-full" variant="outline" onClick={submitPlayer} disabled={playerBusy}>
                {playerBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enter as Player
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
