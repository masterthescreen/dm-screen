import mysql from "mysql2/promise";

// Shared key/value store backed by MySQL, so the GM and players see the same
// live data across devices, and that data survives redeploys (unlike a local
// JSON file on a platform that rebuilds the filesystem on each deploy).
//
// Configure via environment variables (see .env.example):
//   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

export const ALLOWED_KEYS = new Set([
  "codex.world",
  "codex.monsters",
  "codex.encounters",
  "codex.combatants",
  "codex.dicehistory",
  "codex.encountertables",
  "codex.gmnotes",
  "codex.players",
  "codex.gmpasscode",
]);

let pool: mysql.Pool | null = null;
let tableReady: Promise<void> | null = null;

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

async function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = getPool()
      .query(
        `CREATE TABLE IF NOT EXISTS codex_state (
          state_key VARCHAR(64) PRIMARY KEY,
          state_value LONGTEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      )
      .then(() => undefined);
  }
  return tableReady;
}

export async function readState<T>(key: string, fallback: T): Promise<T> {
  await ensureTable();
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

export async function writeState<T>(key: string, value: T): Promise<void> {
  await ensureTable();
  await getPool().query(
    `INSERT INTO codex_state (state_key, state_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE state_value = VALUES(state_value)`,
    [key, JSON.stringify(value)]
  );
}
