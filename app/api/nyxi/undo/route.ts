import { undo, errorResponse } from "@/lib/server/nyxi";
import { fail, json, readJson, requireGm } from "@/lib/server/session";
import { object } from "@/lib/server/nyxi-policy";
export async function POST(req: Request) {
  const g = await requireGm(req);
  if (!g.ok) return g.res;
  const body = await readJson(req);
  if (!object(body) || typeof body.id !== "string")
    return fail(400, "Change ID required.");
  try {
    return json(await undo(body.id));
  } catch (e) {
    return errorResponse(e);
  }
}
