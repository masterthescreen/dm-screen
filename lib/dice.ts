export interface DiceRollResult {
  formula: string;
  rolls: number[];
  modifier: number;
  total: number;
}

// Parses formulas like "2d6+3", "1d20-1", "4d8"
export function rollFormula(formula: string): DiceRollResult {
  const cleaned = formula.replace(/\s+/g, "").toLowerCase();
  const match = cleaned.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!match) {
    return { formula, rolls: [], modifier: 0, total: 0 };
  }
  const count = match[1] ? parseInt(match[1], 10) : 1;
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;
  const rolls: number[] = [];
  for (let i = 0; i < Math.min(count, 100); i++) {
    rolls.push(1 + Math.floor(Math.random() * sides));
  }
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  return { formula, rolls, modifier, total };
}

export function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}
