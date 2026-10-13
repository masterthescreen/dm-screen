import { ddbThrottle, loadSnapshot } from "@/lib/server/ddb-service";
import { applyDdb, getStored } from "@/lib/server/players";
import { fail, json, requireGm } from "@/lib/server/session";

// Re-reads the linked character and updates the sheet.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  const { id } = await params;
  const player = await getStored(id);
  if (!player) return fail(404, "Player not found");
  if (!player.ddb) return fail(400, "Link a character first.");

  const limited = ddbThrottle(id, "gm");
  if (limited) return limited;
  const loaded = await loadSnapshot(player.ddb.characterId);
  if (!loaded.ok) return loaded.res;

  const result = await applyDdb(id, loaded.snapshot, "sync");
  if (!result) return fail(409, "The link changed while syncing. Try again.");
  return json(result);
}
