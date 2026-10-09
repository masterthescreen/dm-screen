import { getState, setState } from "@/lib/server/db";
import { fail, json, readJson, requireGm } from "@/lib/server/session";
import { isPlainObject } from "@/lib/server/validate";

// GM-only campaign data. `players` and all auth data are deliberately NOT in
// this list; they have their own endpoints that never expose access codes.
const SHAPES: Record<string, "object" | "array"> = {
  world: "object",
  monsters: "array",
  encounters: "array",
  combatants: "array",
  dicehistory: "array",
  encountertables: "array",
  gmnotes: "array",
};

const MAX_BYTES = 2_000_000;

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  const { key } = await params;
  if (!(key in SHAPES)) return fail(404, "Unknown data set");
  return json({ value: await getState(`codex.${key}`, null) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const guard = await requireGm(req);
  if (!guard.ok) return guard.res;
  const { key } = await params;
  const shape = SHAPES[key];
  if (!shape) return fail(404, "Unknown data set");
  const body = await readJson(req, MAX_BYTES);
  if (!isPlainObject(body) || !("value" in body)) return fail(400, "Invalid request");
  const value = body.value;
  const okShape = shape === "array" ? Array.isArray(value) : isPlainObject(value);
  if (!okShape) return fail(400, `Expected ${shape}`);
  await setState(`codex.${key}`, value);
  return json({ success: true });
}
