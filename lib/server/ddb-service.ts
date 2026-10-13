import { NextResponse } from "next/server";
import { DdbSnapshot, SheetChange, buildSheetUpdate, fetchCharacter, parseCharacter, parseCharacterId } from "@/lib/server/ddb";
import { takeToken } from "@/lib/server/ratelimit";
import { fail } from "@/lib/server/session";
import { StoredPlayer } from "@/types";

// Shared by the GM and player routes. Keeps outbound traffic to D&D Beyond small and polite:
// every lookup is started by a person, and each one is rate limited.

type Who = "gm" | "player";

const GLOBAL_MAX = 60; // lookups per 10 minutes, whole site
const PER_PLAYER: Record<Who, { max: number; windowMs: number }> = {
  gm: { max: 6, windowMs: 60_000 },
  player: { max: 2, windowMs: 60_000 },
};

/** Returns an error response if a lookup isn't allowed right now. */
export function ddbThrottle(playerId: string, who: Who): NextResponse | null {
  const g = takeToken("ddb:global", GLOBAL_MAX, 10 * 60_000);
  if (!g.ok) {
    return fail(429, "Lots of lookups lately. Try again in a few minutes.", { "Retry-After": String(g.retryAfterSec) });
  }
  const cfg = PER_PLAYER[who];
  const p = takeToken(`ddb:${who}:${playerId}`, cfg.max, cfg.windowMs);
  if (!p.ok) {
    return fail(429, `Easy there. You can sync again in ${p.retryAfterSec} seconds.`, { "Retry-After": String(p.retryAfterSec) });
  }
  return null;
}

export async function loadSnapshot(
  characterId: string
): Promise<{ ok: true; snapshot: DdbSnapshot } | { ok: false; res: NextResponse }> {
  const fetched = await fetchCharacter(characterId);
  if (!fetched.ok) return { ok: false, res: fail(fetched.status === 502 ? 502 : 422, fetched.message) };
  const parsed = parseCharacter(fetched.data, characterId);
  if (!parsed.ok) return { ok: false, res: fail(422, parsed.message) };
  return { ok: true, snapshot: parsed.snapshot };
}

export function idFromInput(input: unknown): { ok: true; id: string } | { ok: false; res: NextResponse } {
  const id = parseCharacterId(input);
  if (!id) {
    return {
      ok: false,
      res: fail(400, "That doesn't look like a character link. Paste the character's link or just its number."),
    };
  }
  return { ok: true, id };
}

export function previewFor(player: StoredPlayer, snapshot: DdbSnapshot): { snapshot: DdbSnapshot; changes: SheetChange[] } {
  const { changes } = buildSheetUpdate(player.character, snapshot, true);
  return { snapshot, changes };
}
