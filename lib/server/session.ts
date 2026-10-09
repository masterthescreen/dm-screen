import { NextResponse } from "next/server";
import { SessionPayload, signSession, verifySession } from "@/lib/server/crypto";
import { readPlayers } from "@/lib/server/db";
import { StoredPlayer } from "@/types";

export const COOKIE_NAME = "codex_session";
const GM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PLAYER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export function json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

export function fail(status: number, message: string, headers?: Record<string, string>) {
  return json({ error: message }, { status, headers });
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export async function startSession(
  res: NextResponse,
  who: { role: "gm" } | { role: "player"; playerId: string; codeVersion: number }
) {
  const ttl = who.role === "gm" ? GM_TTL_MS : PLAYER_TTL_MS;
  const payload: SessionPayload =
    who.role === "gm"
      ? { r: "gm", e: Date.now() + ttl }
      : { r: "player", p: who.playerId, v: who.codeVersion, e: Date.now() + ttl };
  res.cookies.set(COOKIE_NAME, await signSession(payload), { ...cookieBase, maxAge: Math.floor(ttl / 1000) });
}

export function endSession(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", { ...cookieBase, maxAge: 0 });
}

/** The verified session for this request, or null. Player sessions are re-checked against the database. */
export async function getSession(
  req: Request
): Promise<{ role: "gm" } | { role: "player"; player: StoredPlayer } | null> {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  if (payload.r === "gm") return { role: "gm" };
  if (!payload.p) return null;
  const player = (await readPlayers()).find((p) => p.id === payload.p);
  // A deleted player, or one whose code was reset, loses access immediately.
  if (!player || !player.codeHash || player.codeVersion !== payload.v) return null;
  return { role: "player", player };
}

/**
 * Blocks cross-site form/fetch requests. Browsers always send Origin on
 * state-changing requests; if it names a different host, refuse.
 */
export function originAllowed(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser client; cookies alone can't be abused cross-site without Origin
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type GmGuard = { ok: true } | { ok: false; res: NextResponse };
type PlayerGuard = { ok: true; player: StoredPlayer } | { ok: false; res: NextResponse };

export async function requireGm(req: Request): Promise<GmGuard> {
  if (!originAllowed(req)) return { ok: false, res: fail(403, "Cross-site request blocked") };
  const s = await getSession(req);
  if (!s) return { ok: false, res: fail(401, "Not signed in") };
  if (s.role !== "gm") return { ok: false, res: fail(403, "GM access only") };
  return { ok: true };
}

export async function requirePlayer(req: Request): Promise<PlayerGuard> {
  if (!originAllowed(req)) return { ok: false, res: fail(403, "Cross-site request blocked") };
  const s = await getSession(req);
  if (!s) return { ok: false, res: fail(401, "Not signed in") };
  if (s.role !== "player") return { ok: false, res: fail(403, "Player access only") };
  return { ok: true, player: s.player };
}

/** Parses a JSON body with a size cap. Returns undefined if invalid or too large. */
export async function readJson(req: Request, maxBytes = 100_000): Promise<unknown | undefined> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > maxBytes) return undefined;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return undefined;
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
