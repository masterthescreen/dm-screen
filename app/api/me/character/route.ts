import { updatePlayer } from "@/lib/server/players";
import { fail, json, readJson, requirePlayer } from "@/lib/server/session";
import { PLAYER_EDITABLE, cleanCharacterPatch, isPlainObject } from "@/lib/server/validate";

// A player can change only a few fields of their own sheet (current HP,
// equipment, backstory). Class, level, AC, max HP and ability scores are GM-only.
export async function PATCH(req: Request) {
  const guard = await requirePlayer(req);
  if (!guard.ok) return guard.res;
  const body = await readJson(req);
  if (!isPlainObject(body)) return fail(400, "Invalid request");
  const patch = cleanCharacterPatch(body, PLAYER_EDITABLE);
  if (Object.keys(patch).length === 0) return fail(400, "Nothing to update");
  const updated = await updatePlayer(guard.player.id, { character: patch });
  if (!updated) return fail(404, "Player not found");
  return json({ player: updated });
}
