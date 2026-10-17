"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
const shortKey = (key: string) => key.replace(/^codex\./, "");
/** Serialized browser writes with revision checks; rejected drafts stay visible. */
export function useServerState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);
  const current = useRef(value);
  current.current = value;
  const rev = useRef<string | null>(null);
  const dirty = useRef(false),
    saving = useRef(false),
    failed = useRef(false),
    mounted = useRef(true);
  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const report = (e: unknown) =>
    window.dispatchEvent(
      new CustomEvent("campaign-save-error", {
        detail:
          e instanceof Error
            ? e.message
            : "Campaign save failed. Copy unsaved edits before reloading.",
      }),
    );
  const save = useCallback(async () => {
    if (saving.current || failed.current || !dirty.current || !rev.current)
      return;
    saving.current = true;
    try {
      while (dirty.current) {
        const version = sequence.current;
        const snapshot = current.current;
        const data: { revision: string } = await api<{ revision: string }>(
          `/api/gm/${shortKey(key)}`,
          { method: "PUT", body: { value: snapshot, revision: rev.current } },
        );
        rev.current = data.revision;
        if (sequence.current === version) dirty.current = false;
      }
    } catch (e) {
      failed.current = true;
      report(e);
    } finally {
      saving.current = false;
    }
  }, [key]);
  useEffect(() => {
    mounted.current = true;
    let fetching = false;
    const refresh = async () => {
      if (fetching || dirty.current || saving.current || failed.current) return;
      fetching = true;
      const version = sequence.current;
      try {
        const data = await api<{ value: T | null; revision: string }>(
          `/api/gm/${shortKey(key)}`,
        );
        if (!mounted.current || version !== sequence.current || dirty.current)
          return;
        rev.current = data.revision;
        current.current = data.value ?? fallback;
        setValue(current.current);
        setHydrated(true);
      } catch (e) {
        if (mounted.current) report(e);
      } finally {
        fetching = false;
      }
    };
    void refresh();
    const poll = setInterval(refresh, 4000);
    return () => {
      void save();
      mounted.current = false;
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
    };
    // The fallback is a caller-owned default, not a polling dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      if (!rev.current) {
        report(new Error("Campaign data hasn't loaded. Wait before editing."));
        return;
      }
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(current.current)
          : next;
      current.current = resolved;
      setValue(resolved);
      dirty.current = true;
      sequence.current++;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), 500);
    },
    [save],
  );
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  return [value, update, hydrated] as const;
}
