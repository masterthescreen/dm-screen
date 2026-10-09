import mysql from "mysql2/promise";
import { StoredPlayer } from "@/types";

// MySQL access for the whole app. Two tables:
//   codex_state  - GM campaign data (world, monsters, ...) and the player records
//   codex_auth   - secrets: the GM passcode hash and the session-signing secret
// Neither is reachable through a generic endpoint; every read/write goes through
// the role-checked API routes.

const PLAYERS_KEY = "codex.players";

let pool: mysql.Pool | null = null;
let ready: Promise<void> | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "codex",
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}

async function ensureTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const p = getPool();
      await p.query(
        `CREATE TABLE IF NOT EXISTS codex_state (
          state_key VARCHAR(64) PRIMARY KEY,
          state_value LONGTEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
      await p.query(
        `CREATE TABLE IF NOT EXISTS codex_auth (
          auth_key VARCHAR(32) PRIMARY KEY,
          auth_value TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
      // Earlier versions kept the GM passcode in plain text here. Remove it.
      await p.query("DELETE FROM codex_state WHERE state_key = 'codex.gmpasscode'");
    })().catch((err) => {
      ready = null; // allow a retry on the next request
      throw err;
    });
  }
  return ready;
}

// ---------- GM campaign data ----------

export async function getState<T>(key: string, fallback: T): Promise<T> {
  await ensureTables();
  const [rows] = await getPool().query<mysql.RowDataPacket[]>(
    "SELECT state_value FROM codex_state WHERE state_key = ? LIMIT 1",
    [key]
  );
  if (rows.length === 0) return fallback;
  try {
    return JSON.parse(rows[0].state_value) as T;
  } catch {
    return fallback;
  }
}

export async function setState<T>(key: string, value: T): Promise<void> {
  await ensureTables();
  await getPool().query(
    `INSERT INTO codex_state (state_key, state_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE state_value = VALUES(state_value)`,
    [key, JSON.stringify(value)]
  );
}

// ---------- Secrets ----------

export async function getAuthValue(key: string): Promise<string | null> {
  await ensureTables();
  const [rows] = await getPool().query<mysql.RowDataPacket[]>(
    "SELECT auth_value FROM codex_auth WHERE auth_key = ? LIMIT 1",
    [key]
  );
  return rows.length ? (rows[0].auth_value as string) : null;
}

/** Inserts only if the key doesn't exist yet. Returns true if this call created it. */
export async function insertAuthValueIfAbsent(key: string, value: string): Promise<boolean> {
  await ensureTables();
  const [result] = await getPool().query<mysql.ResultSetHeader>(
    "INSERT IGNORE INTO codex_auth (auth_key, auth_value) VALUES (?, ?)",
    [key, value]
  );
  return result.affectedRows === 1;
}

// ---------- Players (atomic read-modify-write) ----------

function normalizePlayer(raw: Record<string, unknown>): StoredPlayer {
  const p = raw as unknown as StoredPlayer & { passcode?: string };
  // Drop any legacy plain-text passcode; those players need a new access code.
  const { passcode: _legacy, ...rest } = p;
  void _legacy;
  return {
    ...rest,
    notes: Array.isArray(p.notes) ? p.notes : [],
    rolls: Array.isArray(p.rolls) ? p.rolls : [],
    codeHash: typeof p.codeHash === "string" ? p.codeHash : "",
    codeVersion: typeof p.codeVersion === "number" ? p.codeVersion : 1,
  };
}

function parsePlayers(raw: string | undefined | null): StoredPlayer[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map((x) => normalizePlayer(x)) : [];
  } catch {
    return [];
  }
}

export async function readPlayers(): Promise<StoredPlayer[]> {
  await ensureTables();
  const [rows] = await getPool().query<mysql.RowDataPacket[]>(
    "SELECT state_value FROM codex_state WHERE state_key = ? LIMIT 1",
    [PLAYERS_KEY]
  );
  return parsePlayers(rows[0]?.state_value);
}

/**
 * Runs `fn` against the current players inside a transaction with the row
 * locked, so concurrent updates (GM editing while a player saves) can't
 * overwrite each other. `fn` returns the new list and a result to hand back.
 */
export async function withPlayers<T>(
  fn: (players: StoredPlayer[]) => { players: StoredPlayer[]; result: T }
): Promise<T> {
  await ensureTables();
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("INSERT IGNORE INTO codex_state (state_key, state_value) VALUES (?, '[]')", [PLAYERS_KEY]);
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT state_value FROM codex_state WHERE state_key = ? FOR UPDATE",
      [PLAYERS_KEY]
    );
    const current = parsePlayers(rows[0]?.state_value);
    const { players, result } = fn(current);
    await conn.query("UPDATE codex_state SET state_value = ? WHERE state_key = ?", [
      JSON.stringify(players),
      PLAYERS_KEY,
    ]);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
