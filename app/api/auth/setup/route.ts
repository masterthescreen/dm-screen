import { hashGmPasscode, safeEqual } from "@/lib/server/crypto";
import { getAuthValue, insertAuthValueIfAbsent } from "@/lib/server/db";
import { checkLimit, clearFailures, clientIp, recordFailure } from "@/lib/server/ratelimit";
import { fail, json, originAllowed, readJson, startSession } from "@/lib/server/session";
import { isPlainObject } from "@/lib/server/validate";

export async function POST(req: Request) {
  if (!originAllowed(req)) return fail(403, "Cross-site request blocked");

  const ipKey = `setup:${clientIp(req)}`;
  const limit = checkLimit(ipKey);
  if (limit.limited) {
    return fail(429, "Too many attempts. Try again later.", { "Retry-After": String(limit.retryAfterSec) });
  }

  if (await getAuthValue("gm_hash")) return fail(409, "The GM account is already set up.");

  const setupCode = process.env.GM_SETUP_CODE;
  if (process.env.NODE_ENV === "production" && !setupCode) {
    return fail(403, "Setup is locked. Set the GM_SETUP_CODE environment variable on the server first.");
  }

  const body = await readJson(req);
  if (!isPlainObject(body)) return fail(400, "Invalid request");
  const passcode = typeof body.passcode === "string" ? body.passcode : "";
  const supplied = typeof body.setupCode === "string" ? body.setupCode : "";

  if (setupCode && !safeEqual(supplied, setupCode)) {
    recordFailure(ipKey);
    return fail(403, "Incorrect setup code.");
  }
  if (passcode.length < 8 || passcode.length > 200) {
    return fail(400, "Choose a passcode of at least 8 characters.");
  }

  const created = await insertAuthValueIfAbsent("gm_hash", await hashGmPasscode(passcode));
  if (!created) return fail(409, "The GM account is already set up.");

  clearFailures(ipKey);
  const res = json({ success: true, role: "gm" });
  await startSession(res, { role: "gm" });
  return res;
}
