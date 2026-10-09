import { addNote } from "@/lib/server/players";
import { fail, json, readJson, requireGm } from "@/lib/server/session";
import { cleanNote } from "@/lib/server/validate";

// GM sends a note into a player's notebook (flagged "From GM").
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  const { id } = await params;
  const note = cleanNote(await readJson(req), true);
  if (!note) return fail(400, "A note needs a title.");
  const saved = await addNote(id, note);
  if (!saved) return fail(404, "Player not found");
  return json({ note: saved }, { status: 201 });
}
