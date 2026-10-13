import { CharacterSheet } from "@/types";

// D&D Beyond character import.
//
// Uses D&D Beyond's character service, which serves *public* character sheets
// as JSON. It's an undocumented endpoint, so everything here is defensive: we
// only read the handful of fields we need, and treat any surprise as "couldn't
// read this character" rather than guessing.
//
// Safety: the only thing taken from the user is a numeric character id. The
// host is fixed, so a pasted link can never make the server contact anywhere else.

const DEFAULT_BASE = "https://character-service.dndbeyond.com";
const MAX_BYTES = 8_000_000; // real sheets are ~1.5 MB
const TIMEOUT_MS = 15_000;

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";
const ABILITIES: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];
const SCORE_SUBTYPES = [
  "strength-score",
  "dexterity-score",
  "constitution-score",
  "intelligence-score",
  "wisdom-score",
  "charisma-score",
];
const MODIFIER_GROUPS = ["race", "class", "background", "feat", "item"] as const;

export interface DdbSnapshot {
  characterId: string;
  name: string;
  race: string;
  className: string;
  level: number;
  abilities: Record<AbilityKey, number>;
  maxHp: number;
  currentHp: number;
  warnings: string[];
}

export interface SheetChange {
  field: string;
  from: string | number;
  to: string | number;
}

// ---------- Reading the id out of what the user pasted ----------

/** Accepts a bare id ("12345678") or a character link. Anything else is rejected. */
export function parseCharacterId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (!s || s.length > 200) return null;
  if (/^\d{4,12}$/.test(s)) return s;
  const m = s.match(/^https:\/\/(?:www\.)?dndbeyond\.com\/(?:profile\/[^/?#]+\/)?characters\/(\d{4,12})(?:[/?#]|$)/i);
  return m ? m[1] : null;
}

// ---------- Fetching ----------

export type FetchResult = { ok: true; data: unknown } | { ok: false; status: number; message: string };

async function readCapped(res: Response, cap: number): Promise<string | null> {
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > cap) return null;
  if (!res.body) return await res.text();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function fetchCharacter(characterId: string): Promise<FetchResult> {
  const base = process.env.DDB_API_BASE || DEFAULT_BASE;
  const url = `${base}/character/v5/character/${characterId}?includeCustomItems=true`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "error",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Codex-GM-Companion/1.0 (single character sync, started by a player or GM)",
      },
    });
    if (res.status === 404) {
      return { ok: false, status: 404, message: "D&D Beyond couldn't find that character. Check the link or id." };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        status: 403,
        message:
          "That character isn't public. In D&D Beyond, open the character, go to Settings, then Privacy, and set it to Public.",
      };
    }
    if (!res.ok) {
      return { ok: false, status: 502, message: "D&D Beyond isn't responding right now. Try again in a minute." };
    }
    const text = await readCapped(res, MAX_BYTES);
    if (text === null) return { ok: false, status: 502, message: "D&D Beyond sent back more data than expected, so it was ignored." };
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, status: 502, message: "D&D Beyond sent something we couldn't read." };
    }
    if (isObj(json) && json.success === false) {
      return {
        ok: false,
        status: 403,
        message: "D&D Beyond wouldn't share that character. Make sure it's set to Public in its privacy settings.",
      };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, status: 502, message: "Couldn't reach D&D Beyond. Try again in a minute." };
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Parsing ----------

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const abilityMod = (score: number) => Math.floor((score - 10) / 2);

interface Mod {
  type: string;
  subType: string;
  amount: number | null;
  conditional: boolean;
  componentId: number | null;
  group: (typeof MODIFIER_GROUPS)[number];
}

export type ParseResult = { ok: true; snapshot: DdbSnapshot } | { ok: false; message: string };

const UNREADABLE = "That doesn't look like a character sheet we can read. D&D Beyond may have changed its format.";

export function parseCharacter(payload: unknown, characterId: string): ParseResult {
  const root = isObj(payload) ? payload : null;
  const d = root && isObj(root.data) ? root.data : null;
  if (!d) return { ok: false, message: UNREADABLE };

  const warnings: string[] = [];

  // --- base scores (ids 1..6 = STR..CHA) ---
  const base: number[] = [];
  const statList = Array.isArray(d.stats) ? d.stats : [];
  for (let id = 1; id <= 6; id++) {
    const entry = statList.find((s) => isObj(s) && s.id === id);
    const value = isObj(entry) ? num(entry.value) : null;
    if (value === null) return { ok: false, message: UNREADABLE };
    base.push(value);
  }

  // --- classes ---
  const classes = (Array.isArray(d.classes) ? d.classes : [])
    .map((c) => {
      if (!isObj(c) || !isObj(c.definition)) return null;
      const level = num(c.level);
      const name = str(c.definition.name, 40);
      return level !== null && level > 0 && name ? { name, level: Math.round(level) } : null;
    })
    .filter((c): c is { name: string; level: number } => c !== null);
  if (classes.length === 0) return { ok: false, message: UNREADABLE };
  const level = clamp(
    classes.reduce((sum, c) => sum + c.level, 0),
    1,
    30
  );
  const className = (
    classes.length === 1 ? classes[0].name : classes.map((c) => `${c.name} ${c.level}`).join(" / ")
  ).slice(0, 60);

  // --- which inventory items are actually in effect ---
  // Gear only counts when it's equipped, and attuned if it needs attunement.
  const inventory = Array.isArray(d.inventory) ? d.inventory : [];
  const activeItems = new Set<number>();
  const knownItems = new Set<number>();
  for (const it of inventory) {
    if (!isObj(it) || !isObj(it.definition)) continue;
    const defId = num(it.definition.id);
    if (defId === null) continue;
    knownItems.add(defId);
    const needsAttunement = it.definition.canAttune === true;
    if (it.equipped === true && (!needsAttunement || it.isAttuned === true)) activeItems.add(defId);
  }

  // --- gather the modifiers that apply right now ---
  const mods: Mod[] = [];
  let skippedItemMods = 0;
  const modRoot = isObj(d.modifiers) ? d.modifiers : {};
  for (const group of MODIFIER_GROUPS) {
    const list = Array.isArray(modRoot[group]) ? (modRoot[group] as unknown[]) : [];
    for (const m of list) {
      if (!isObj(m)) continue;
      const componentId = num(m.componentId);
      if (group === "item" && (componentId === null || !activeItems.has(componentId))) {
        skippedItemMods++;
        continue;
      }
      mods.push({
        type: str(m.type, 40),
        subType: str(m.subType, 60),
        amount: num(m.value) ?? num(m.fixedValue),
        conditional: typeof m.restriction === "string" && m.restriction.trim() !== "",
        componentId,
        group,
      });
    }
  }
  void knownItems;

  // --- ability scores ---
  const bonusStats = Array.isArray(d.bonusStats) ? d.bonusStats : [];
  const overrideStats = Array.isArray(d.overrideStats) ? d.overrideStats : [];
  const finalScores: number[] = [];
  for (let i = 0; i < 6; i++) {
    const manualBonus = isObj(bonusStats.find((s) => isObj(s) && s.id === i + 1))
      ? num((bonusStats.find((s) => isObj(s) && s.id === i + 1) as Record<string, unknown>).value) ?? 0
      : 0;
    const overrideEntry = overrideStats.find((s) => isObj(s) && s.id === i + 1);
    const override = isObj(overrideEntry) ? num(overrideEntry.value) : null;

    let bonus = 0;
    let set: number | null = null;
    for (const m of mods) {
      if (m.subType !== SCORE_SUBTYPES[i] || m.conditional || m.amount === null) continue;
      if (m.type === "bonus") bonus += m.amount;
      else if (m.type === "set") set = set === null ? m.amount : Math.max(set, m.amount);
    }

    let score = Math.min(20, base[i] + manualBonus + bonus); // the standard cap of 20
    if (set !== null && set > score) score = set; // e.g. a Belt of Giant Strength
    if (override !== null) score = override; // the sheet's own "override score" box
    finalScores.push(clamp(Math.round(score), 1, 30));
  }
  const abilities = Object.fromEntries(ABILITIES.map((k, i) => [k, finalScores[i]])) as Record<AbilityKey, number>;

  // --- hit points ---
  const baseHp = num(d.baseHitPoints);
  if (baseHp === null) return { ok: false, message: UNREADABLE };
  const overrideHp = num(d.overrideHitPoints);
  const bonusHp = num(d.bonusHitPoints) ?? 0;
  const perLevel = mods
    .filter((m) => m.type === "bonus" && m.subType === "hit-points-per-level" && !m.conditional && m.amount !== null)
    .reduce((sum, m) => sum + (m.amount as number), 0);
  const conMod = abilityMod(abilities.con);
  const maxHp = clamp(
    Math.round(overrideHp !== null ? overrideHp : baseHp + bonusHp + conMod * level + perLevel * level),
    1,
    9999
  );
  const removed = num(d.removedHitPoints) ?? 0;
  const currentHp = clamp(Math.round(maxHp - removed), 0, maxHp);

  if (skippedItemMods > 0 && activeItems.size === 0 && inventory.length > 0) {
    warnings.push("None of this character's magic items are equipped (or attuned), so their bonuses weren't counted.");
  }

  return {
    ok: true,
    snapshot: {
      characterId,
      name: str(d.name, 100) || "Unnamed",
      race: isObj(d.race) ? str(d.race.fullName, 60) : "",
      className,
      level,
      abilities,
      maxHp,
      currentHp,
      warnings,
    },
  };
}

// ---------- Turning a snapshot into sheet updates ----------

const LABELS: Record<string, string> = {
  className: "Class",
  race: "Race",
  level: "Level",
  maxHp: "Max HP",
  currentHp: "Current HP",
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

/**
 * What the character sheet becomes after a sync, plus a readable list of what
 * changed. AC is deliberately left alone (see the project notes).
 *
 * Current HP: set from D&D Beyond the first time a character is linked. After
 * that, it's left as the table has been tracking it, except that it follows any
 * increase in max HP (a level-up) and never exceeds the new max.
 */
export function buildSheetUpdate(
  current: CharacterSheet,
  snap: DdbSnapshot,
  firstTime: boolean
): { character: CharacterSheet; changes: SheetChange[] } {
  const nextCurrentHp = firstTime
    ? snap.currentHp
    : clamp(current.currentHp + Math.max(0, snap.maxHp - current.maxHp), -999, snap.maxHp);

  const character: CharacterSheet = {
    ...current,
    className: snap.className,
    race: snap.race,
    level: snap.level,
    maxHp: snap.maxHp,
    currentHp: nextCurrentHp,
    ...snap.abilities,
  };

  const changes: SheetChange[] = [];
  for (const field of ["className", "race", "level", "str", "dex", "con", "int", "wis", "cha", "maxHp", "currentHp"] as const) {
    if (current[field] !== character[field]) {
      changes.push({ field: LABELS[field], from: current[field], to: character[field] });
    }
  }
  return { character, changes };
}
