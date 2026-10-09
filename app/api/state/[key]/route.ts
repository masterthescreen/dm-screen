import { NextResponse } from "next/server";
import { ALLOWED_KEYS, readState, writeState } from "@/lib/server-db";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "Unknown state key" }, { status: 404 });
  }
  const value = await readState(key, null);
  return NextResponse.json({ value });
}

export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "Unknown state key" }, { status: 404 });
  }
  const body = await request.json();
  await writeState(key, body.value);
  return NextResponse.json({ success: true });
}
