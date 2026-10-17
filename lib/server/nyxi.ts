import mysql from "mysql2/promise";
import { randomUUID } from "crypto";
import { ensureTables, getPool, getState } from "@/lib/server/db";
import { listPublic } from "@/lib/server/players";
import { requireGm, fail } from "@/lib/server/session";
import { safeEqual } from "@/lib/server/crypto";
import { takeToken, clientIp } from "@/lib/server/ratelimit";
import {
  applyChange,
  CampaignError,
  Change,
  DATASETS,
  revision,
} from "@/lib/server/nyxi-policy";
export async function requireNyxi(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return requireGm(req);
  const limit = takeToken(`nyxi-key:${clientIp(req)}`, 60, 60000);
  if (!limit.ok)
    return { ok: false as const, res: fail(429, "Too many requests.") };
  const key = process.env.NYXI_APP_KEY;
  if (!key || key.length < 32 || !safeEqual(auth, `Bearer ${key}`))
    return { ok: false as const, res: fail(401, "Invalid integration key.") };
  return { ok: true as const };
}
export async function context(dataset?: string) {
  if (dataset && dataset !== "players" && !DATASETS.includes(dataset))
    throw new CampaignError(404, "Unknown data set.");
  const data: Record<string, unknown> = {};
  for (const key of dataset && dataset !== "players"
    ? [dataset]
    : dataset
      ? []
      : DATASETS) {
    const value = await getState(`codex.${key}`, key === "world" ? null : []);
    data[key] = { value, revision: revision(value) };
  }
  if (!dataset || dataset === "players") data.players = await listPublic();
  return data;
}
export async function mutate(change: Change, actor = "nyxi") {
  await ensureTables();
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    // Lock the same row used by GM browser saves; a snapshot and its write commit together.
    await conn.query(
      "INSERT IGNORE INTO codex_state (state_key,state_value) VALUES (?,?)",
      [
        `codex.${change.dataset}`,
        JSON.stringify(change.dataset === "world" ? null : []),
      ],
    );
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT state_value FROM codex_state WHERE state_key=? FOR UPDATE",
      [`codex.${change.dataset}`],
    );
    const before = JSON.parse(rows[0].state_value);
    const after = applyChange(before, change);
    const id = randomUUID();
    await conn.query(
      "INSERT INTO codex_nyxi_audit (id,state_key,actor,reason,before_value,after_value) VALUES (?,?,?,?,?,?)",
      [
        id,
        `codex.${change.dataset}`,
        actor,
        change.reason,
        JSON.stringify(before),
        JSON.stringify(after),
      ],
    );
    await conn.query("UPDATE codex_state SET state_value=? WHERE state_key=?", [
      JSON.stringify(after),
      `codex.${change.dataset}`,
    ]);
    await conn.commit();
    return { id, dataset: change.dataset, revision: revision(after) };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
export async function history() {
  await ensureTables();
  const [rows] = await getPool().query<mysql.RowDataPacket[]>(
    "SELECT id,state_key,actor,reason,created_at FROM codex_nyxi_audit ORDER BY created_at DESC,id DESC LIMIT 50",
  );
  return rows;
}
export async function undo(id: string) {
  await ensureTables();
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [audit] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT * FROM codex_nyxi_audit WHERE id=?",
      [id],
    );
    if (!audit.length) throw new CampaignError(404, "Change not found.");
    const a = audit[0];
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT state_value FROM codex_state WHERE state_key=? FOR UPDATE",
      [a.state_key],
    );
    if (
      !rows.length ||
      revision(JSON.parse(rows[0].state_value)) !==
        revision(JSON.parse(a.after_value))
    )
      throw new CampaignError(
        409,
        "Later edits exist. Undo would overwrite them; review manually.",
      );
    const undoId = randomUUID();
    await conn.query(
      "INSERT INTO codex_nyxi_audit (id,state_key,actor,reason,before_value,after_value) VALUES (?,?,?,?,?,?)",
      [
        undoId,
        a.state_key,
        "gm-undo",
        `Undo ${id}`,
        a.after_value,
        a.before_value,
      ],
    );
    await conn.query("UPDATE codex_state SET state_value=? WHERE state_key=?", [
      a.before_value,
      a.state_key,
    ]);
    await conn.commit();
    return { id: undoId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
export function errorResponse(e: unknown) {
  return fail(
    e instanceof CampaignError ? e.status : 500,
    e instanceof CampaignError
      ? e.message
      : "Nyxi couldn't complete this request. Any completed changes remain in the change history.",
  );
}
