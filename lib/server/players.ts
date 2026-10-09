import { CharacterSheet, Note, Player, RollRecord, StoredPlayer } from "@/types";
import { readPlayers, withPlayers } from "@/lib/server/db";
import { generatePlayerCode, hashPlayerCode } from "@/lib/server/crypto";

export function toPublic(p: StoredPlayer): Player {
  // Explicit allow-list: never spread the stored record, so new secret fields can't leak by accident.
  return {
    id: p.id,
    playerName: p.playerName,
    characterName: p.characterName,
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
  await withPlayers((players) => ({ players: [...players, stored], result: null }));
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

/** Issues a fresh access code. The old code and any signed-in session stop working. */
export async function resetCode(id: string): Promise<string | null> {
  const code = generatePlayerCode();
  const codeHash = await hashPlayerCode(code);
  const ok = await withPlayers((players) => {
    const idx = players.findIndex((p) => p.id === id);
    if (idx === -1) return { players, result: false };
    const copy = [...players];
    copy[idx] = { ...copy[idx], codeHash, codeVersion: copy[idx].codeVersion + 1 };
    return { players: copy, result: true };
  });
  return ok ? code : null;
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
