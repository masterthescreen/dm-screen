import { normalizeCode } from "@/lib/server/crypto";
import { inviteIsValid } from "@/lib/server/invite";
import { createAccountPlayer } from "@/lib/server/players";
import { checkLimit, clientIp, recordFailure } from "@/lib/server/ratelimit";
import { fail, json, originAllowed, readJson, startSession } from "@/lib/server/session";
import { cleanString, cleanUsername, isPlainObject, passwordProblem } from "@/lib/server/validate";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A player creates their own account. Needs the GM's current invite code.
export async function POST(req: Request) {
  if (!originAllowed(req)) return fail(403, "Cross-site request blocked");

  const ipKey = `signup:${clientIp(req)}`;
  const limit = checkLimit(ipKey);
  if (limit.limited) {
    return fail(429, "Too many attempts. Try again in a few minutes.", { "Retry-After": String(limit.retryAfterSec) });
  }

  const body = await readJson(req);
  if (!isPlainObject(body)) return fail(400, "Invalid request");

  // Check the invite first, so nobody can probe which usernames exist without one.
  const invite = typeof body.invite === "string" ? normalizeCode(body.invite.slice(0, 40)) : "";
  if (invite.length !== 10 || !(await inviteIsValid(invite))) {
    recordFailure(ipKey);
    await sleep(400);
    return fail(403, "That invite code isn't valid, or it has expired. Ask your GM for a new one.");
  }

  const username = cleanUsername(body.username);
  if (!username) {
    return fail(400, "Usernames are 3-24 characters: letters, numbers, dots, dashes or underscores.");
  }
  const problem = passwordProblem(body.password, username);
  if (problem) return fail(400, problem);

  const characterName = cleanString(body.characterName, 100)?.trim() || "Unnamed";
  const playerName = cleanString(body.playerName, 100)?.trim() || username;

  const result = await createAccountPlayer({
    username,
    password: body.password as string,
    playerName,
    characterName,
  });
  if (!result.ok) {
    if (result.reason === "table_full") return fail(409, "This table is full. Ask your GM to make room.");
    return fail(409, "That username is taken. Try another.");
  }

  const res = json({ success: true, role: "player" }, { status: 201 });
  await startSession(res, { role: "player", playerId: result.player.id, codeVersion: result.player.codeVersion });
  return res;
}
