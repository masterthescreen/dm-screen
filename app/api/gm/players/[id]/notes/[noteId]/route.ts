import { removeNote } from "@/lib/server/players";
import { fail, json, requireGm } from "@/lib/server/session";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  const { id, noteId } = await params;
  if (!(await removeNote(id, noteId, false))) return fail(404, "Note not found");
  return json({ success: true });
}
