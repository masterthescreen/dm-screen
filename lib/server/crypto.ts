import crypto from "crypto";
import { promisify } from "util";
import { getAuthValue, insertAuthValueIfAbsent } from "@/lib/server/db";

const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: crypto.ScryptOptions
) => Promise<Buffer>;

const SCRYPT = { N: 16384, r: 8, p: 1 } as const;

// ---------- Signing secret ----------

let cachedSecret: string | null = null;

/**
 * Secret used to sign session cookies and key the player-code hashes.
 * Uses SESSION_SECRET if set; otherwise one is generated on first use and
 * stored in the database, so deployment needs no extra setup.
 */
export async function getSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }
  await insertAuthValueIfAbsent("session_secret", crypto.randomBytes(32).toString("hex"));
  const stored = await getAuthValue("session_secret");
  if (!stored) throw new Error("Could not initialise session secret");
  cachedSecret = stored;
  return cachedSecret;
}

// ---------- GM passcode (human-chosen, so slow-hashed with a salt) ----------

export async function hashGmPasscode(passcode: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(passcode, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyGmPasscode(passcode: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(passcode, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

// ---------- Player access codes (server-generated, high entropy) ----------

// No 0/O/1/I/L so codes are easy to read out and type on a phone.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** 8 characters from a 31-letter alphabet ≈ 40 bits, shown as XXXX-XXXX. */
export function generatePlayerCode(): string {
  let out = "";
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function hashPlayerCode(code: string): Promise<string> {
  const secret = await getSecret();
  return crypto.createHmac("sha256", secret).update(`player-code:${normalizeCode(code)}`).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// ---------- Session tokens ----------

export interface SessionPayload {
  r: "gm" | "player";
  p?: string; // player id
  v?: number; // player's codeVersion at login
  e: number; // expiry, epoch ms
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const secret = await getSecret();
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(`session:${body}`).digest("base64url");
  return `${body}.${sig}`;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const secret = await getSecret();
  const expected = crypto.createHmac("sha256", secret).update(`session:${body}`).digest("base64url");
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.e !== "number" || payload.e < Date.now()) return null;
    if (payload.r !== "gm" && payload.r !== "player") return null;
    return payload;
  } catch {
    return null;
  }
}
