import { setRolls } from "@/lib/server/players";
import { fail, json, readJson, requirePlayer } from "@/lib/server/session";
import { cleanRolls, isPlainObject } from "@/lib/server/validate";

export async function PUT(req: Request) {
  const guard = await requirePlayer(req);
  if (!guard.ok) return guard.res;
  const body = await readJson(req);
  if (!isPlainObject(body)) return fail(400, "Invalid request");
  const rolls = cleanRolls(body.rolls);
  if (!rolls) return fail(400, "Invalid rolls");
  await setRolls(guard.player.id, rolls);
  return json({ success: true });
}
