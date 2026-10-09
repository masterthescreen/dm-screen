"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const POLL_INTERVAL_MS = 4000;
const LOCAL_WRITE_GRACE_MS = 2500;
const WRITE_DEBOUNCE_MS = 500;

// "codex.world" -> "world". Only GM-only data sets are reachable this way.
const shortKey = (key: string) => key.replace(/^codex\./, "");

async function fetchState<T>(key: string, fallback: T): Promise<T> {
  const data = await api<{ value: T | null }>(`/api/gm/${shortKey(key)}`);
  return (data.value ?? fallback) as T;
}

async function pushState<T>(key: string, value: T): Promise<void> {
  await api(`/api/gm/${shortKey(key)}`, { method: "PUT", body: { value } });
}

/**
 * GM-side persistence for campaign data (world, monsters, encounters, ...).
 * Syncs with the server, debounces writes, and polls so a second GM device
 * stays current. The server only allows the signed-in GM to use this.
 */
export function useServerState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);
  const lastLocalWriteAt = useRef(0);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    let cancelled = false;

    fetchState(key, fallback)
      .then((v) => {
        if (cancelled) return;
        setValue(v);
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });

    const interval = setInterval(() => {
      if (Date.now() - lastLocalWriteAt.current < LOCAL_WRITE_GRACE_MS) return;
      fetchState(key, fallback)
        .then((v) => {
          if (cancelled) return;
          if (JSON.stringify(v) !== JSON.stringify(valueRef.current)) setValue(v);
        })
        .catch(() => undefined);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
        lastLocalWriteAt.current = Date.now();
        if (writeTimer.current) clearTimeout(writeTimer.current);
        writeTimer.current = setTimeout(() => {
          pushState(key, resolved).catch(() => undefined);
        }, WRITE_DEBOUNCE_MS);
        return resolved;
      });
    },
    [key]
  );

  return [value, update, hydrated] as const;
}
