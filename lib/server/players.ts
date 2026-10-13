import { CharacterSheet, Note, Player, RollRecord, StoredPlayer } from "@/types";
import { DdbSnapshot, SheetChange, buildSheetUpdate } from "@/lib/server/ddb";
import { readPlayers, withPlayers } from "@/lib/server/db";
import { generatePlayerCode, generateTempPassword, hashPassword, hashPlayerCode } from "@/lib/server/crypto";

export function toPublic(p: StoredPlayer): Player {
  // Explicit allow-list: never spread the stored record, so new secret fields can't leak by accident.
  return {
    id: p.id,
    playerName: p.playerName,
    characterName: p.characterName,
    ...(p.username ? { username: p.username } : {}),
    ...(p.mustChangePassword ? { mustChangePassword: true } : {}),
    ...(p.ddb ? { ddb: p.ddb } : {}),
    character: p.character,
    notes: p.notes,
    rolls: p.rolls,
  };
}

export function blankCharacter(): CharacterSheet {
  return {
    className: "",
    race: "",
    level: 1,
    maxHp: 10,
    currentHp: 10,
    ac: 10,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    equipment: "",
    backstory: "",
  };
}

export async function listPublic(): Promise<Player[]> {
  return (await readPlayers()).map(toPublic);
}

/** Creates a player and returns their one-time access code. */
export async function createPlayer(playerName: string, characterName: string): Promise<{ player: Player; code: string }> {
  const code = generatePlayerCode();
  const codeHash = await hashPlayerCode(code);
  const stored: StoredPlayer = {
    id: crypto.randomUUID(),
    playerName,
    characterName,
    character: blankCharacter(),
    notes: [],
    rolls: [],
    codeHash,
    codeVersion: 1,
  };
  const added = await withPlayers((players) => {
    if (players.length >= MAX_PLAYERS) return { players, result: false };
    return { players: [...players, stored], result: true };
  });
  if (!added) throw new Error("table_full");
  return { player: toPublic(stored), code };
}

export async function updatePlayer(
  id: string,
  patch: { playerName?: string; characterName?: string; character?: Partial<CharacterSheet> }
): Promise<Player | null> {
  return withPlayers((players) => {
    const idx = players.findIndex((p) => p.id === id);
    if (idx === -1) return { players, result: null };
    const cur = players[idx];
    const next: StoredPlayer = {
      ...cur,
      playerName: patch.playerName ?? cur.playerName,
      characterName: patch.characterName ?? cur.characterName,
      character: { ...cur.character, ...(patch.character ?? {}) },
    };
    const copy = [...players];
    copy[idx] = next;
    return { players: copy, result: toPublic(next) };
  });
}

export async function removePlayer(id: string): Promise<boolean> {
  return withPlayers((players) => {
    const next = players.filter((p) => p.id !== id);
    return { players: next, result: next.length !== players.length };
  });
}

/**
 * Resets a player's sign-in. Code players get a fresh access code; password
 * players get a one-time temporary password and must choose a new one. Either
 * way the old credential and every signed-in session stop working at once.
 */
export async function resetCredential(id: string): Promise<{ secret: string; kind: "code" | "password" } | null> {
  const code = generatePlayerCode();
  const temp = generateTempPassword();
  const [codeHash, tempHash] = await Promise.all([hashPlayerCode(code), hashPassword(temp)]);
  type Reset = { secret: string; kind: "code" | "password" } | null;
  return withPlayers((players): { players: StoredPlayer[]; result: Reset } => {
    const idx = players.findIndex((p) => p.id === id);
    if (idx === -1) return { players, result: null };
    const cur = players[idx];
    const copy = [...players];
    if (cur.username) {
      copy[idx] = { ...cur, passHash: tempHash, mustChangePassword: true, codeVersion: cur.codeVersion + 1 };
      return { players: copy, result: { secret: temp, kind: "password" } };
    }
    copy[idx] = { ...cur, codeHash, codeVersion: cur.codeVersion + 1 };
    return { players: copy, result: { secret: code, kind: "code" } };
  });
}

export const MAX_PLAYERS = 40;

export type SignupResult =
  | { ok: true; player: StoredPlayer }
  | { ok: false; reason: "username_taken" | "table_full" };

/** Creates a player who signed up themselves. Username uniqueness is checked inside the locked transaction. */
export async function createAccountPlayer(args: {
  username: string;
  password: string;
  playerName: string;
  characterName: string;
}): Promise<SignupResult> {
  const passHash = await hashPassword(args.password);
  const stored: StoredPlayer = {
    id: crypto.randomUUID(),
    playerName: args.playerName,
    characterName: args.characterName,
    username: args.username,
    character: blankCharacter(),
    notes: [],
    rolls: [],
    codeHash: "",
    passHash,
    codeVersion: 1,
  };
  return withPlayers((players): { players: StoredPlayer[]; result: SignupResult } => {
    if (players.length >= MAX_PLAYERS) return { players, result: { ok: false, reason: "table_full" } };
    if (players.some((p) => p.username === args.username)) {
      return { players, result: { ok: false, reason: "username_taken" } };
    }
    return { players: [...players, stored], result: { ok: true, player: stored } };
  });
}

export async function findByUsername(username: string): Promise<StoredPlayer | null> {
  return (await readPlayers()).find((p) => p.username === username) ?? null;
}

/** Sets a new password, clears the must-change flag, and ends every other session (version bump). */
export async function changePassword(id: string, newPassword: string): Promise<StoredPlayer | null> {
  const passHash = await hashPassword(newPassword);
  return withPlayers((players) => {
    const idx = players.findIndex((p) => p.id === id);
    if (idx === -1) return { players, result: null };
    const cur = players[idx];
    const next: StoredPlayer = { ...cur, passHash, mustChangePassword: false, codeVersion: cur.codeVersion + 1 };
    const copy = [...players];
    copy[idx] = next;
    return { players: copy, result: next };
  });
}

export async function addNote(id: string, note: Note): Promise<Note | null> {
  return withPlayers((players) => {
    const idx = players.findIndex((p) => p.id === id);
    if (idx === -1) return { players, result: null };
    const copy = [...players];
    copy[idx] = { ...copy[idx], notes: [note, ...copy[idx].notes].slice(0, 500) };
    return { players: copy, result: note };
  });
}

/** `onlyOwn` lets a player delete just the notes they wrote, not ones the GM sent. */
export async function removeNote(id: string, noteId: string, onlyOwn: boolean): Promise<boolean> {
  return withPlayers((players) => {
    const idx = players.findIndex((p) => p.id === id);
    if (idx === -1) return { players, result: false };
    const target = players[idx].notes.find((n) => n.id === noteId);
    if (!target || (onlyOwn && target.fromGM)) return { players, result: false };
    const copy = [...players];
    copy[idx] = { ...copy[idx], notes: copy[idx].notes.filter((n) => n.id !== noteId) };
    return { players: copy, result: true };
  });
}

export async function setRolls(id: string, rolls: RollRecord[]): Promise<boolean> {
  return withPlayers((players) => {
    const idx = players.findIndex((p) => p.id === id);
    if (idx === -1) return { players, result: false };
    const copy = [...players];
    copy[idx] = { ...copy[idx], rolls };
    return { players: copy, result: true };
  });
}

// ---------- Linked character (external site) ----------

/**
 * Writes a snapshot onto a player's sheet. `link` also (re)points the player at
 * this character; `sync` requires it to match the one already linked, so a
 * re-sync can never switch characters.
 */
export async function applyDdb(
  id: string,
  snap: DdbSnapshot,
  mode: "link" | "sync"
): Promise<{ player: Player; changes: SheetChange[] } | null> {
  type Out = { player: Player; changes: SheetChange[] } | null;
  return withPlayers((players): { players: StoredPlayer[]; result: Out } => {
    const idx = players.findIndex((p) => p.id === id);
    if (idx === -1) return { players, result: null };
    const cur = players[idx];
    if (mode === "sync" && cur.ddb?.characterId !== snap.characterId) return { players, result: null };

    const now = Date.now();
    const firstTime = mode === "link" || !cur.ddb || cur.ddb.lastSyncedAt === null;
    const { character, changes } = buildSheetUpdate(cur.character, snap, firstTime);
    const next: StoredPlayer = {
      ...cur,
      character,
      ddb: {
        characterId: snap.characterId,
        name: snap.name,
        linkedAt: mode === "link" ? now : cur.ddb?.linkedAt ?? now,
        lastSyncedAt: now,
      },
    };
    const copy = [...players];
    copy[idx] = next;
    return { players: copy, result: { player: toPublic(next), changes } };
  });
}

export async function unlinkDdb(id: string): Promise<boolean> {
  return withPlayers((players) => {
    const idx = players.findIndex((p) => p.id === id);
    if (idx === -1 || !players[idx].ddb) return { players, result: false };
    const { ddb: _removed, ...rest } = players[idx];
    void _removed;
    const copy = [...players];
    copy[idx] = rest as StoredPlayer;
    return { players: copy, result: true };
  });
}

export async function getStored(id: string): Promise<StoredPlayer | null> {
  return (await readPlayers()).find((p) => p.id === id) ?? null;
}
