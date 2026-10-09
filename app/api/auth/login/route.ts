import { hashPlayerCode, normalizeCode, safeEqual, verifyGmPasscode } from "@/lib/server/crypto";
import { getAuthValue, readPlayers } from "@/lib/server/db";
import { checkLimit, clearFailures, clientIp, recordFailure } from "@/lib/server/ratelimit";
import { fail, json, originAllowed, readJson, startSession } from "@/lib/server/session";
import { isPlainObject } from "@/lib/server/validate";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  if (!originAllowed(req)) return fail(403, "Cross-site request blocked");

  const ipKey = `login:${clientIp(req)}`;
  const limit = checkLimit(ipKey);
  if (limit.limited) {
    return fail(429, "Too many failed attempts. Try again in a few minutes.", {
      "Retry-After": String(limit.retryAfterSec),
    });
  }

  const body = await readJson(req);
  if (!isPlainObject(body)) return fail(400, "Invalid request");

  const reject = async (message: string) => {
    recordFailure(ipKey);
    await sleep(400); // slows down guessing
    return fail(401, message);
  };

  if (body.type === "gm") {
    const hash = await getAuthValue("gm_hash");
    if (!hash) return fail(409, "The GM account hasn't been set up yet.");
    const passcode = typeof body.passcode === "string" ? body.passcode.slice(0, 200) : "";
    if (!(await verifyGmPasscode(passcode, hash))) return reject("Incorrect passcode.");
    clearFailures(ipKey);
    const res = json({ success: true, role: "gm" });
    await startSession(res, { role: "gm" });
    return res;
  }

  if (body.type === "player") {
    const code = typeof body.code === "string" ? normalizeCode(body.code.slice(0, 40)) : "";
    if (code.length !== 8) return reject("That player code isn't right.");
    const candidate = await hashPlayerCode(code);
    const players = await readPlayers();
    // Compare against every player so timing doesn't reveal how many exist or which matched first.
    let match: (typeof players)[number] | null = null;
    for (const p of players) {
      if (p.codeHash && safeEqual(p.codeHash, candidate)) match = p;
    }
    if (!match) return reject("That player code isn't right.");
    clearFailures(ipKey);
    const res = json({ success: true, role: "player" });
    await startSession(res, { role: "player", playerId: match.id, codeVersion: match.codeVersion });
    return res;
  }

  return fail(400, "Invalid request");
}
