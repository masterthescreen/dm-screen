import { context, errorResponse, requireNyxi } from "@/lib/server/nyxi";
import { json } from "@/lib/server/session";
export async function GET(req: Request) {
  const g = await requireNyxi(req);
  if (!g.ok) return g.res;
  try {
    return json(
      await context(new URL(req.url).searchParams.get("dataset") ?? undefined),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
