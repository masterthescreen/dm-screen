import { getAuthValue } from "@/lib/server/db";
import { getSession, json } from "@/lib/server/session";

// Public: only booleans and the caller's own role. Nothing about players or the campaign.
export async function GET(req: Request) {
  const gmConfigured = !!(await getAuthValue("gm_hash"));
  const setupCode = process.env.GM_SETUP_CODE;
  const isProd = process.env.NODE_ENV === "production";
  const session = await getSession(req);
  return json({
    gmConfigured,
    // In production the first-time GM setup must be unlocked with GM_SETUP_CODE,
    // so a stranger who finds the site first can't claim it.
    setupCodeRequired: !!setupCode,
    setupAvailable: !gmConfigured && (!isProd || !!setupCode),
    role: session ? session.role : null,
  });
}
