import { verifyPassword } from "@/lib/server/crypto";
import { changePassword } from "@/lib/server/players";
import { checkLimit, clearFailures, clientIp, recordFailure } from "@/lib/server/ratelimit";
import { fail, json, readJson, requirePlayer, startSession } from "@/lib/server/session";
import { isPlainObject, passwordProblem } from "@/lib/server/validate";

// A player changes their own password. Needs the current one, and signs out
// every other device (this one stays signed in with a fresh session).
export async function PUT(req: Request) {
  const guard = await requirePlayer(req);
  if (!guard.ok) return guard.res;
  const { player } = guard;
  if (!player.passHash || !player.username) return fail(400, "This account signs in with a GM-issued code, not a password.");

  const key = `pw:${player.id}`;
  const limit = checkLimit(key);
  if (limit.limited) {
    return fail(429, "Too many attempts. Try again in a few minutes.", { "Retry-After": String(limit.retryAfterSec) });
  }

  const body = await readJson(req);
  if (!isPlainObject(body)) return fail(400, "Invalid request");
  const current = typeof body.current === "string" ? body.current.slice(0, 200) : "";
  if (!(await verifyPassword(current, player.passHash))) {
    recordFailure(key);
    return fail(401, "Your current password isn't right.");
  }
  const problem = passwordProblem(body.next, player.username);
  if (problem) return fail(400, problem);
  if (body.next === current) return fail(400, "Pick a password different from your current one.");

  const updated = await changePassword(player.id, body.next as string);
  if (!updated) return fail(404, "Player not found");
  clearFailures(key);
  const res = json({ success: true });
  await startSession(res, { role: "player", playerId: updated.id, codeVersion: updated.codeVersion });
  return res;
}
