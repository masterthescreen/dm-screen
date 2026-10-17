import { mutate, errorResponse, requireNyxi } from "@/lib/server/nyxi";
import { Change, object, WRITABLE } from "@/lib/server/nyxi-policy";
import { fail, json, readJson } from "@/lib/server/session";
export async function POST(req: Request) {
  const g = await requireNyxi(req);
  if (!g.ok) return g.res;
  const body = await readJson(req, 100000);
  if (!object(body) || !WRITABLE.includes(String(body.dataset)))
    return fail(400, "Invalid campaign change.");
  try {
    return json(await mutate(body as Change));
  } catch (e) {
    return errorResponse(e);
  }
}
