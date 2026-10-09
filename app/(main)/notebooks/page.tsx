"use client";

import Link from "next/link";
import { useServerState } from "@/lib/server-storage";
import { usePlayers } from "@/lib/use-players";
import { GMNote } from "@/types";
import { GMNotes } from "@/components/notebooks/gm-notes";
import { Loader2 } from "lucide-react";

export default function NotebooksPage() {
  const [gmNotes, setGmNotes, hydrated] = useServerState<GMNote[]>("codex.gmnotes", []);
  const { players, loaded, sendNote } = usePlayers();

  if (!hydrated || !loaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 border-b border-border/60 pb-5">
        <h1 className="font-display text-3xl font-bold">GM Notes</h1>
        <p className="text-muted-foreground mt-1">
          Your private journal. Send any note to a player&apos;s notebook.{" "}
          {players.length === 0 && (
            <>
              No players yet &mdash;{" "}
              <Link href="/players" className="underline text-primary">
                add players
              </Link>{" "}
              to send notes.
            </>
          )}
        </p>
      </div>
      <GMNotes notes={gmNotes} onChange={setGmNotes} players={players} onSend={sendNote} />
    </div>
  );
}
