import { resetCode } from "@/lib/server/players";
import { fail, json, requireGm } from "@/lib/server/session";

// Issues a new access code (shown once). The old code and any signed-in
// session for that player stop working immediately.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  const { id } = await params;
  const code = await resetCode(id);
  if (!code) return fail(404, "Player not found");
  return json({ code });
}
