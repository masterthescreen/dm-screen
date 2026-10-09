"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Player } from "@/types";
import { SharedLoreItem } from "@/lib/shared-lore";

export type Me = { role: "gm" } | { role: "player"; player: Player; lore: SharedLoreItem[] };

interface MeContextValue {
  me: Me | null;
  loaded: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const MeContext = createContext<MeContextValue | null>(null);

const PLAYER_POLL_MS = 4000;

/**
 * Holds "who am I" as reported by the server. Nothing here is trusted for
 * security — it only drives what the UI shows. The server re-checks every request.
 * Players poll so GM changes (shared lore, notes) appear without a refresh.
 */
export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);
  const lastJson = useRef<string>("");

  const refresh = useCallback(async () => {
    try {
      const data = await api<Me>("/api/me");
      const serialized = JSON.stringify(data);
      if (serialized !== lastJson.current) {
        lastJson.current = serialized;
        setMe(data);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        lastJson.current = "";
        setMe(null);
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      lastJson.current = "";
      setMe(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isPlayer = me?.role === "player";
  useEffect(() => {
    if (!isPlayer) return;
    const id = setInterval(refresh, PLAYER_POLL_MS);
    return () => clearInterval(id);
  }, [isPlayer, refresh]);

  return <MeContext.Provider value={{ me, loaded, refresh, logout }}>{children}</MeContext.Provider>;
}

export function useMe(): MeContextValue {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe must be used inside MeProvider");
  return ctx;
}
