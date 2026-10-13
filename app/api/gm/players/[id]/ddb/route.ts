import { ddbThrottle, idFromInput, loadSnapshot } from "@/lib/server/ddb-service";
import { applyDdb, getStored, unlinkDdb } from "@/lib/server/players";
import { fail, json, readJson, requireGm } from "@/lib/server/session";
import { isPlainObject } from "@/lib/server/validate";

// Links a character to a player and applies it to their sheet. The numbers come
// from the character service, fetched here; nothing numeric is accepted from the browser.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  const { id } = await params;
  if (!(await getStored(id))) return fail(404, "Player not found"); // before any outside lookup

  const body = await readJson(req);
  const parsed = idFromInput(isPlainObject(body) ? body.input : undefined);
  if (!parsed.ok) return parsed.res;

  const limited = ddbThrottle(id, "gm");
  if (limited) return limited;
  const loaded = await loadSnapshot(parsed.id);
  if (!loaded.ok) return loaded.res;

  const result = await applyDdb(id, loaded.snapshot, "link");
  if (!result) return fail(404, "Player not found");
  return json(result);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  const { id } = await params;
  if (!(await unlinkDdb(id))) return fail(404, "That player isn't linked to a character.");
  return json({ success: true });
}
