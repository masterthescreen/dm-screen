"use client";

import { useLocalStorage } from "@/lib/storage";
import { useServerState } from "@/lib/server-storage";
import { Session } from "@/types";

const SESSION_KEY = "codex.session";
const GM_PASSCODE_KEY = "codex.gmpasscode";

// Session (which device is logged in as whom) is per-browser, so it stays in
// local storage. The GM passcode itself is shared server state, since any
// device needs to be able to validate against it.
export function useSession() {
  return useLocalStorage<Session | null>(SESSION_KEY, null);
}

export function useGmPasscode() {
  return useServerState<string>(GM_PASSCODE_KEY, "");
}

export function clearSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_KEY);
  }
}
