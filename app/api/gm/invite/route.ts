import { DEFAULT_INVITE_DAYS, createInvite, inviteStatus, revokeInvite } from "@/lib/server/invite";
import { cleanInt, isPlainObject } from "@/lib/server/validate";
import { json, readJson, requireGm } from "@/lib/server/session";

export async function GET(req: Request) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  return json(await inviteStatus());
}

// Creates a new invite (replacing any current one) and returns the code once.
export async function POST(req: Request) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  const body = await readJson(req);
  const days = (isPlainObject(body) ? cleanInt(body.days, 1, 30) : null) ?? DEFAULT_INVITE_DAYS;
  const { code, expiresAt } = await createInvite(days);
  return json({ code, expiresAt }, { status: 201 });
}

export async function DELETE(req: Request) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  await revokeInvite();
  return json({ success: true });
}
