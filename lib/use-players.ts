"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CharacterSheet, Player } from "@/types";

export interface PlayerPatch {
  playerName?: string;
  characterName?: string;
  character?: Partial<CharacterSheet>;
}

const POLL_MS = 5000;

/** GM-side access to the player list and the operations on it (all server-checked). */
export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ players: Player[] }>("/api/gm/players");
      setPlayers((prev) => (JSON.stringify(prev) === JSON.stringify(res.players) ? prev : res.players));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const create = useCallback(
    async (playerName: string, characterName: string) => {
      const res = await api<{ player: Player; code: string }>("/api/gm/players", {
        method: "POST",
        body: { playerName, characterName },
      });
      await refresh();
      return res;
    },
    [refresh]
  );

  const patch = useCallback(async (id: string, body: PlayerPatch) => {
    const res = await api<{ player: Player }>(`/api/gm/players/${id}`, { method: "PATCH", body });
    setPlayers((prev) => prev.map((p) => (p.id === id ? res.player : p)));
    return res.player;
  }, []);

  const remove = useCallback(
    async (id: string) => {
      await api(`/api/gm/players/${id}`, { method: "DELETE" });
      await refresh();
    },
    [refresh]
  );

  const resetCode = useCallback(async (id: string) => {
    const res = await api<{ code: string }>(`/api/gm/players/${id}/reset-code`, { method: "POST" });
    return res.code;
  }, []);

  const sendNote = useCallback(
    async (id: string, title: string, content: string) => {
      await api(`/api/gm/players/${id}/notes`, { method: "POST", body: { title, content } });
      await refresh();
    },
    [refresh]
  );

  const deleteNote = useCallback(
    async (id: string, noteId: string) => {
      await api(`/api/gm/players/${id}/notes/${noteId}`, { method: "DELETE" });
      await refresh();
    },
    [refresh]
  );

  return { players, loaded, refresh, create, patch, remove, resetCode, sendNote, deleteNote };
}
