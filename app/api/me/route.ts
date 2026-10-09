import { getState } from "@/lib/server/db";
import { toPublic } from "@/lib/server/players";
import { fail, getSession, json } from "@/lib/server/session";
import { collectSharedLore } from "@/lib/shared-lore";
import { World } from "@/types";

// Who am I, plus (for a player) only what that player is allowed to see:
// their own record and the lore entries shared with them. The full world
// never leaves the server for a player.
export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) return fail(401, "Not signed in");
  if (session.role === "gm") return json({ role: "gm" });

  const world = await getState<World | null>("codex.world", null);
  return json({
    role: "player",
    player: toPublic(session.player),
    lore: collectSharedLore(world, session.player.id),
  });
}
