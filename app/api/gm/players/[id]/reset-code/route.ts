import { resetCredential } from "@/lib/server/players";
import { fail, json, requireGm } from "@/lib/server/session";

// Resets a player's sign-in. Code players get a new access code; password
// players get a one-time temporary password they must replace. The secret is
// shown once; the old credential and any signed-in session stop working now.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  const { id } = await params;
  const result = await resetCredential(id);
  if (!result) return fail(404, "Player not found");
  return json({ secret: result.secret, kind: result.kind });
}
