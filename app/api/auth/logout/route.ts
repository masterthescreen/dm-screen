import { endSession, fail, json, originAllowed } from "@/lib/server/session";

export async function POST(req: Request) {
  if (!originAllowed(req)) return fail(403, "Cross-site request blocked");
  const res = json({ success: true });
  endSession(res);
  return res;
}
