import { CharacterSheet, Note, RollRecord } from "@/types";

// Input hygiene for everything a client can send. Strings are length-capped and
// numbers clamped, so a bad or hostile request can't store junk or huge values.

export function cleanString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  return v.slice(0, max);
}

export function cleanInt(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const NUMBER_FIELDS: Record<string, [number, number]> = {
  level: [1, 30],
  maxHp: [0, 9999],
  currentHp: [-999, 9999],
  ac: [0, 99],
  str: [1, 30],
  dex: [1, 30],
  con: [1, 30],
  int: [1, 30],
  wis: [1, 30],
  cha: [1, 30],
};

const TEXT_FIELDS: Record<string, number> = {
  className: 60,
  race: 60,
  equipment: 5000,
  backstory: 10000,
};

/** Which character fields a player may change on their own sheet. */
export const PLAYER_EDITABLE = new Set(["currentHp", "equipment", "backstory"]);

/** Validates a partial character update, keeping only `allowed` fields. */
export function cleanCharacterPatch(input: unknown, allowed?: Set<string>): Partial<CharacterSheet> {
  const out: Record<string, unknown> = {};
  if (!isPlainObject(input)) return out;
  for (const [key, value] of Object.entries(input)) {
    if (allowed && !allowed.has(key)) continue;
    if (key in NUMBER_FIELDS) {
      const [min, max] = NUMBER_FIELDS[key];
      const n = cleanInt(value, min, max);
      if (n !== null) out[key] = n;
    } else if (key in TEXT_FIELDS) {
      const s = cleanString(value, TEXT_FIELDS[key]);
      if (s !== null) out[key] = s;
    }
  }
  return out as Partial<CharacterSheet>;
}

export function cleanNote(input: unknown, fromGM: boolean): Note | null {
  if (!isPlainObject(input)) return null;
  const title = cleanString(input.title, 200);
  const content = cleanString(input.content, 20000);
  if (title === null || !title.trim()) return null;
  return {
    id: crypto.randomUUID(),
    title,
    content: content ?? "",
    createdAt: new Date().toISOString(),
    ...(fromGM ? { fromGM: true } : {}),
  };
}

export function cleanRolls(input: unknown): RollRecord[] | null {
  if (!Array.isArray(input)) return null;
  const out: RollRecord[] = [];
  for (const r of input.slice(0, 50)) {
    if (!isPlainObject(r)) continue;
    const id = cleanString(r.id, 64);
    const label = cleanString(r.label, 100);
    const formula = cleanString(r.formula, 50);
    const timestamp = cleanString(r.timestamp, 50);
    const total = cleanInt(r.total, -100000, 100000);
    const modifier = cleanInt(r.modifier, -1000, 1000);
    const rolls = Array.isArray(r.rolls)
      ? r.rolls.slice(0, 100).map((n) => cleanInt(n, -100000, 100000) ?? 0)
      : [];
    if (id === null || label === null || formula === null || timestamp === null || total === null || modifier === null) {
      continue;
    }
    out.push({ id, label, formula, timestamp, total, modifier, rolls });
  }
  return out;
}
