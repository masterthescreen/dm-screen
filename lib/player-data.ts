import { CharacterSheet, Player } from "@/types";
import { uid } from "@/lib/storage";

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

export function blankPlayer(): Player {
  return {
    id: uid(),
    playerName: "",
    characterName: "",
    passcode: "",
    character: blankCharacter(),
    notes: [],
  };
}
