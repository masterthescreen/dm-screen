import { removeNote } from "@/lib/server/players";
import { fail, json, requirePlayer } from "@/lib/server/session";

// Players can delete their own notes, not ones the GM sent them.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePlayer(req);
  if (!guard.ok) return guard.res;
  const { id } = await params;
  const ok = await removeNote(guard.player.id, id, true);
  if (!ok) return fail(404, "Note not found");
  return json({ success: true });
}
