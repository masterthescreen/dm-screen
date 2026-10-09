import { addNote } from "@/lib/server/players";
import { fail, json, readJson, requirePlayer } from "@/lib/server/session";
import { cleanNote } from "@/lib/server/validate";

export async function POST(req: Request) {
  const guard = await requirePlayer(req);
  if (!guard.ok) return guard.res;
  const note = cleanNote(await readJson(req), false);
  if (!note) return fail(400, "A note needs a title.");
  const saved = await addNote(guard.player.id, note);
  if (!saved) return fail(404, "Player not found");
  return json({ note: saved }, { status: 201 });
}
