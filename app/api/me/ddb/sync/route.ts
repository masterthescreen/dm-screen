import { ddbThrottle, loadSnapshot } from "@/lib/server/ddb-service";
import { applyDdb } from "@/lib/server/players";
import { fail, json, requirePlayer } from "@/lib/server/session";

// A player re-syncs THEIR OWN linked character. They can't choose which one it
// is; only the GM sets the link.
export async function POST(req: Request) {
  const guard = await requirePlayer(req);
  if (!guard.ok) return guard.res;
  const { player } = guard;
  if (!player.ddb) return fail(400, "Your GM hasn't linked a character to you yet.");

  const limited = ddbThrottle(player.id, "player");
  if (limited) return limited;
  const loaded = await loadSnapshot(player.ddb.characterId);
  if (!loaded.ok) return loaded.res;

  const result = await applyDdb(player.id, loaded.snapshot, "sync");
  if (!result) return fail(409, "Your link changed while syncing. Try again.");
  return json(result);
}
