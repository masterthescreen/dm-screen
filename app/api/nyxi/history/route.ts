import { history, errorResponse } from "@/lib/server/nyxi";
import { json, requireGm } from "@/lib/server/session";
export async function GET(req: Request) {
  const g = await requireGm(req);
  if (!g.ok) return g.res;
  try {
    return json({ changes: await history() });
  } catch (e) {
    return errorResponse(e);
  }
}
