import { ddbThrottle, idFromInput, loadSnapshot, previewFor } from "@/lib/server/ddb-service";
import { getStored } from "@/lib/server/players";
import { fail, json, readJson, requireGm } from "@/lib/server/session";
import { isPlainObject } from "@/lib/server/validate";

// Shows what linking a character would change. Writes nothing.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  const { id } = await params;
  const player = await getStored(id);
  if (!player) return fail(404, "Player not found");

  const body = await readJson(req);
  const parsed = idFromInput(isPlainObject(body) ? body.input : undefined);
  if (!parsed.ok) return parsed.res;

  const limited = ddbThrottle(id, "gm");
  if (limited) return limited;
  const loaded = await loadSnapshot(parsed.id);
  if (!loaded.ok) return loaded.res;
  return json(previewFor(player, loaded.snapshot));
}
