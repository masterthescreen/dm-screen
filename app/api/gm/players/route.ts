import { createPlayer, listPublic } from "@/lib/server/players";
import { fail, json, readJson, requireGm } from "@/lib/server/session";
import { cleanString, isPlainObject } from "@/lib/server/validate";

export async function GET(req: Request) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  return json({ players: await listPublic() });
}

// Creates a player. The access code is generated here and returned exactly
// once; only a hash of it is stored.
export async function POST(req: Request) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  const body = await readJson(req);
  if (!isPlainObject(body)) return fail(400, "Invalid request");
  const playerName = cleanString(body.playerName, 100)?.trim();
  const characterName = cleanString(body.characterName, 100)?.trim();
  if (!playerName) return fail(400, "Player name is required.");
  const { player, code } = await createPlayer(playerName, characterName || "Unnamed");
  return json({ player, code }, { status: 201 });
}
