import { removePlayer, updatePlayer } from "@/lib/server/players";
import { fail, json, readJson, requireGm } from "@/lib/server/session";
import { cleanCharacterPatch, cleanString, isPlainObject } from "@/lib/server/validate";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  const { id } = await params;
  const body = await readJson(req);
  if (!isPlainObject(body)) return fail(400, "Invalid request");

  const patch: Parameters<typeof updatePlayer>[1] = {};
  if (body.playerName !== undefined) {
    const v = cleanString(body.playerName, 100)?.trim();
    if (v) patch.playerName = v;
  }
  if (body.characterName !== undefined) {
    const v = cleanString(body.characterName, 100)?.trim();
    if (v) patch.characterName = v;
  }
  if (body.character !== undefined) patch.character = cleanCharacterPatch(body.character);

  const updated = await updatePlayer(id, patch);
  if (!updated) return fail(404, "Player not found");
  return json({ player: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  const { id } = await params;
  if (!(await removePlayer(id))) return fail(404, "Player not found");
  return json({ success: true });
}
