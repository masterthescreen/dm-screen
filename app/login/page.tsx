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

type PlayerMode = "signin" | "join" | "code";

function LinkButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-xs underline text-primary hover:text-primary/80">
      {children}
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { me, loaded, refresh } = useMe();
  const [status, setStatus] = useState<AuthStatus | null>(null);

  // --- GM ---
  const [gmPasscode, setGmPasscode] = useState("");
  const [gmConfirm, setGmConfirm] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [gmError, setGmError] = useState<string | null>(null);
  const [gmBusy, setGmBusy] = useState(false);

  // --- Player ---
  const [mode, setMode] = useState<PlayerMode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [invite, setInvite] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [playerCode, setPlayerCode] = useState("");
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [playerBusy, setPlayerBusy] = useState(false);

  useEffect(() => {
    api<AuthStatus>("/api/auth/status")
      .then(setStatus)
      .catch(() => setStatus({ gmConfigured: false, setupAvailable: false, setupCodeRequired: false, role: null }));
  }, []);

  // An invite link (/login?invite=XXXXX-XXXXX) opens the sign-up form with the code filled in.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("invite");
    if (code) {
      setInvite(code.slice(0, 20));
      setMode("join");
      window.history.replaceState(null, "", "/login"); // keep the code out of the address bar and history
    }
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

  const switchMode = (next: PlayerMode) => {
    setPlayerError(null);
    setPassword("");
    setConfirm("");
    setMode(next);
  };

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
    if (mode === "signin") {
      if (!username.trim() || !password) return setPlayerError("Enter your username and password.");
    } else if (mode === "join") {
      if (!invite.trim()) return setPlayerError("Enter the invite code from your GM.");
      if (!username.trim()) return setPlayerError("Choose a username.");
      if (password.length < 8) return setPlayerError("Use a password of at least 8 characters.");
      if (password !== confirm) return setPlayerError("The passwords don't match.");
    } else if (!playerCode.trim()) {
      return setPlayerError("Enter the code your GM gave you.");
    }

    setPlayerBusy(true);
    try {
      if (mode === "signin") {
        await api("/api/auth/login", { method: "POST", body: { type: "password", username, password } });
      } else if (mode === "join") {
        await api("/api/auth/signup", {
          method: "POST",
          body: { invite, username, password, playerName, characterName },
        });
      } else {
        await api("/api/auth/login", { method: "POST", body: { type: "player", code: playerCode } });
      }
      await finish("player");
    } catch (err) {
      setPlayerError(message(err));
    } finally {
      setPlayerBusy(false);
    }
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void submitPlayer();
  };

  const firstRun = !status.gmConfigured;

  const playerTitle =
    mode === "join" ? "Create your account" : mode === "code" ? "Sign in with a GM code" : "Sign in";
  const playerDescription =
    mode === "join"
      ? "Enter the invite code your GM shared, then choose a username and password."
      : mode === "code"
      ? "Enter the code your GM gave you."
      : "Sign in with your username and password.";

  return (
    <div className="min-h-screen flex items-center justify-center parchment-texture p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-primary">Codex</h1>
          <p className="font-accent italic text-muted-foreground mt-1">the GM&apos;s companion</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
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
                <CardTitle className="font-display">Player — {playerTitle}</CardTitle>
              </div>
              <CardDescription>{playerDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mode === "join" && (
                <div className="space-y-1.5">
                  <Label htmlFor="invite">Invite code</Label>
                  <Input
                    id="invite"
                    placeholder="XXXXX-XXXXX"
                    autoComplete="off"
                    autoCapitalize="characters"
                    className="font-mono tracking-widest"
                    value={invite}
                    onChange={(e) => setInvite(e.target.value)}
                    onKeyDown={onEnter}
                  />
                </div>
              )}

              {mode !== "code" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={onEnter}
                    />
                    {mode === "join" && (
                      <p className="text-xs text-muted-foreground">3-24 characters: letters, numbers, dots, dashes, underscores.</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">{mode === "join" ? "Password (8+ characters)" : "Password"}</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === "join" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={onEnter}
                    />
                  </div>
                </>
              )}

              {mode === "join" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm">Confirm password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      onKeyDown={onEnter}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="player-name">Your name</Label>
                      <Input id="player-name" placeholder="Optional" value={playerName} onChange={(e) => setPlayerName(e.target.value)} onKeyDown={onEnter} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="character-name">Character name</Label>
                      <Input id="character-name" value={characterName} onChange={(e) => setCharacterName(e.target.value)} onKeyDown={onEnter} />
                    </div>
                  </div>
                </>
              )}

              {mode === "code" && (
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
                    onKeyDown={onEnter}
                  />
                </div>
              )}

              {playerError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{playerError}</AlertDescription>
                </Alert>
              )}

              <Button className="w-full" onClick={submitPlayer} disabled={playerBusy}>
                {playerBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === "join" ? "Create Account" : "Sign In"}
              </Button>

              <div className="flex flex-col items-start gap-1.5 pt-1">
                {mode === "signin" && (
                  <>
                    <LinkButton onClick={() => switchMode("join")}>New here? Join with an invite code</LinkButton>
                    <LinkButton onClick={() => switchMode("code")}>Have a player code from your GM instead?</LinkButton>
                  </>
                )}
                {mode === "join" && <LinkButton onClick={() => switchMode("signin")}>Already have an account? Sign in</LinkButton>}
                {mode === "code" && <LinkButton onClick={() => switchMode("signin")}>Back to username and password</LinkButton>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
