"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useServerState } from "@/lib/server-storage";
import { useSession, useGmPasscode } from "@/lib/auth";
import { Player } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Crown, User, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [session, setSession, hydratedSession] = useSession();
  const [players, , hydratedPlayers] = useServerState<Player[]>("codex.players", []);
  const [gmPasscode, setGmPasscode, hydratedGm] = useGmPasscode();

  const [gmInput, setGmInput] = useState("");
  const [gmConfirm, setGmConfirm] = useState("");
  const [gmError, setGmError] = useState<string | null>(null);

  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [playerPasscode, setPlayerPasscode] = useState("");
  const [playerError, setPlayerError] = useState<string | null>(null);

  const hydrated = hydratedSession && hydratedPlayers && hydratedGm;

  useEffect(() => {
    if (!hydrated) return;
    if (session) {
      router.replace(session.role === "gm" ? "/" : "/player");
    }
  }, [hydrated, session, router]);

  if (!hydrated || session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const isFirstRunGm = gmPasscode.trim().length === 0;

  const submitGm = () => {
    setGmError(null);
    if (isFirstRunGm) {
      if (gmInput.trim().length < 4) {
        setGmError("Choose a passcode of at least 4 characters.");
        return;
      }
      if (gmInput !== gmConfirm) {
        setGmError("Passcodes don't match.");
        return;
      }
      setGmPasscode(gmInput.trim());
      setSession({ role: "gm" });
      router.replace("/");
      return;
    }
    if (gmInput !== gmPasscode) {
      setGmError("Incorrect passcode.");
      return;
    }
    setSession({ role: "gm" });
    router.replace("/");
  };

  const submitPlayer = () => {
    setPlayerError(null);
    const player = players.find((p) => p.id === selectedPlayerId);
    if (!player) {
      setPlayerError("Choose your character.");
      return;
    }
    if (player.passcode && player.passcode !== playerPasscode) {
      setPlayerError("Incorrect passcode.");
      return;
    }
    setSession({ role: "player", playerId: player.id });
    router.replace("/player");
  };

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
                {isFirstRunGm
                  ? "No passcode set yet — choose one to protect your GM tools."
                  : "Enter your passcode to access the full toolkit."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Passcode</Label>
                <Input
                  type="password"
                  value={gmInput}
                  onChange={(e) => setGmInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isFirstRunGm && submitGm()}
                />
              </div>
              {isFirstRunGm && (
                <div className="space-y-1.5">
                  <Label>Confirm passcode</Label>
                  <Input
                    type="password"
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
              <Button className="w-full" onClick={submitGm}>
                {isFirstRunGm ? "Set Passcode & Enter" : "Enter as Game Master"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-accent" />
                <CardTitle className="font-display">Player</CardTitle>
              </div>
              <CardDescription>
                {players.length === 0
                  ? "Your GM hasn't added any characters yet."
                  : "Choose your character and enter your passcode, if one was set."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Character</Label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId} disabled={players.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your character" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.characterName || "Unnamed"} ({p.playerName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Passcode (if set by your GM)</Label>
                <Input
                  type="password"
                  value={playerPasscode}
                  onChange={(e) => setPlayerPasscode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitPlayer()}
                />
              </div>
              {playerError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{playerError}</AlertDescription>
                </Alert>
              )}
              <Button className="w-full" variant="outline" onClick={submitPlayer} disabled={players.length === 0}>
                Enter as Player
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
