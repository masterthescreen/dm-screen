import { generateInviteCode, hashInviteCode, safeEqual } from "@/lib/server/crypto";
import { getAuthValue, setAuthValue, deleteAuthValue } from "@/lib/server/db";

// One active invite at a time. Only a keyed hash of the code is stored, so a
// database leak doesn't reveal it. The GM sees the code once, when creating it.

const KEY = "invite";
export const DEFAULT_INVITE_DAYS = 7;

interface StoredInvite {
  hash: string;
  createdAt: number;
  expiresAt: number;
}

async function load(): Promise<StoredInvite | null> {
  const raw = await getAuthValue(KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as StoredInvite;
    return typeof v.hash === "string" && typeof v.expiresAt === "number" ? v : null;
  } catch {
    return null;
  }
}

export async function inviteStatus(): Promise<{ active: boolean; expiresAt: number | null }> {
  const inv = await load();
  if (!inv || inv.expiresAt <= Date.now()) return { active: false, expiresAt: null };
  return { active: true, expiresAt: inv.expiresAt };
}

/** Replaces any existing invite. The previous code stops working immediately. */
export async function createInvite(days: number): Promise<{ code: string; expiresAt: number }> {
  const code = generateInviteCode();
  const now = Date.now();
  const expiresAt = now + days * 24 * 60 * 60 * 1000;
  const invite: StoredInvite = { hash: await hashInviteCode(code), createdAt: now, expiresAt };
  await setAuthValue(KEY, JSON.stringify(invite));
  return { code, expiresAt };
}

export async function revokeInvite(): Promise<void> {
  await deleteAuthValue(KEY);
}

export async function inviteIsValid(code: string): Promise<boolean> {
  const inv = await load();
  if (!inv || inv.expiresAt <= Date.now()) return false;
  return safeEqual(inv.hash, await hashInviteCode(code));
}
