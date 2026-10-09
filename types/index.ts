// ---------- Lore ----------
export interface Shop {
  id: string;
  sharedWith?: string[]; // player ids who can see this entry
  name: string;
  type: string;
  description: string;
  proprietor: string;
}

export interface Person {
  id: string;
  sharedWith?: string[]; // player ids who can see this entry
  name: string;
  role: string;
  description: string;
  secrets: string;
}

export interface City {
  id: string;
  sharedWith?: string[]; // player ids who can see this entry
  name: string;
  description: string;
  population: string;
  shops: Shop[];
  people: Person[];
}

export interface Kingdom {
  id: string;
  sharedWith?: string[]; // player ids who can see this entry
  name: string;
  description: string;
  ruler: string;
  cities: City[];
}

export interface Continent {
  id: string;
  sharedWith?: string[]; // player ids who can see this entry
  name: string;
  description: string;
  kingdoms: Kingdom[];
}

export interface World {
  id: string;
  sharedWith?: string[]; // player ids who can see this entry
  name: string;
  description: string;
  continents: Continent[];
}

// ---------- Combat ----------
export interface Monster {
  id: string;
  name: string;
  type: string;
  cr: string;
  hp: number;
  ac: number;
  speed: string;
  stats: string; // free-form STR/DEX/CON/INT/WIS/CHA summary
  abilities: string;
  notes: string;
}

export type CombatantKind = "pc" | "monster";

export interface Combatant {
  id: string;
  playerId?: string; // set when this combatant is a player character
  name: string;
  kind: CombatantKind;
  initiative: number;
  maxHp: number;
  currentHp: number;
  ac: number;
  conditions: string[];
  notes: string;
}

export interface Encounter {
  id: string;
  name: string;
  description: string;
  difficulty: "trivial" | "easy" | "medium" | "hard" | "deadly";
  monsterIds: { monsterId: string; count: number }[];
  createdAt: string;
}

// ---------- Dice ----------
export interface RollRecord {
  id: string;
  label: string;
  formula: string;
  rolls: number[];
  modifier: number;
  total: number;
  timestamp: string;
}

export interface EncounterTableEntry {
  id: string;
  range: string; // e.g. "1-5"
  result: string;
}

export interface EncounterTable {
  id: string;
  name: string;
  terrain: string;
  diceSize: number; // e.g. 20 for d20
  entries: EncounterTableEntry[];
}

// ---------- Notes ----------
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  fromGM?: boolean;
}

export interface GMNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}

// ---------- Players & Characters ----------
export interface CharacterSheet {
  className: string;
  race: string;
  level: number;
  maxHp: number;
  currentHp: number;
  ac: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  equipment: string;
  backstory: string;
}

export interface Player {
  id: string;
  playerName: string;
  characterName: string;
  passcode: string;
  character: CharacterSheet;
  notes: Note[];
}

// ---------- Auth ----------
export type Role = "gm" | "player";

export interface Session {
  role: Role;
  playerId?: string;
}
