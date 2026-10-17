import { createHash, randomUUID } from "crypto";
export const DATASETS = [
  "world",
  "gmnotes",
  "monsters",
  "encounters",
  "combatants",
  "encountertables",
  "dicehistory",
];
export const WRITABLE = DATASETS.filter((k) => k !== "dicehistory");
export class CampaignError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const revision = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function object(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
export type Change = {
  dataset: string;
  revision: string;
  operation: "create" | "update" | "delete";
  id?: string;
  parentId?: string;
  collection?: string;
  fields?: Record<string, unknown>;
  reason: string;
};
const fields: Record<string, string[]> = {
  world: ["name", "description"],
  continents: ["name", "description"],
  kingdoms: ["name", "description", "ruler"],
  cities: ["name", "description", "population"],
  shops: ["name", "type", "description", "proprietor"],
  people: ["name", "role", "description", "secrets"],
  gmnotes: ["title", "content", "tags"],
  monsters: [
    "name",
    "type",
    "cr",
    "hp",
    "ac",
    "speed",
    "stats",
    "abilities",
    "notes",
  ],
  encounters: ["name", "description", "difficulty", "monsterIds"],
  combatants: [
    "name",
    "kind",
    "initiative",
    "maxHp",
    "currentHp",
    "ac",
    "conditions",
    "notes",
  ],
  encountertables: ["name", "terrain", "diceSize"],
  entries: ["range", "result"],
};
const children: Record<string, string[]> = {
  world: ["continents"],
  continents: ["kingdoms"],
  kingdoms: ["cities"],
  cities: ["shops", "people"],
  encountertables: ["entries"],
};
const numbers = ["hp", "ac", "initiative", "maxHp", "currentHp", "diceSize"];
function validate(kind: string, patch: Record<string, unknown>) {
  for (const [key, value] of Object.entries(patch)) {
    if (!fields[kind]?.includes(key))
      throw new CampaignError(
        400,
        `Field ${key} is outside this entry's editable scope.`,
      );
    if (["tags", "conditions"].includes(key)) {
      if (!Array.isArray(value) || value.some((v) => typeof v !== "string"))
        throw new CampaignError(400, "Expected string list.");
    } else if (key === "monsterIds") {
      if (
        !Array.isArray(value) ||
        value.some(
          (v) =>
            !object(v) ||
            Object.keys(v).some((k) => !["monsterId", "count"].includes(k)) ||
            typeof v.monsterId !== "string" ||
            !Number.isInteger(v.count) ||
            Number(v.count) < 1,
        )
      )
        throw new CampaignError(400, "Invalid monster list.");
    } else if (numbers.includes(key)) {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        (key !== "initiative" && value < 0)
      )
        throw new CampaignError(400, "Invalid number.");
    } else if (typeof value !== "string" || value.length > 50000)
      throw new CampaignError(
        400,
        "Expected text of at most 50,000 characters.",
      );
    if (key === "kind" && !["pc", "monster"].includes(String(value)))
      throw new CampaignError(400, "Invalid combatant kind.");
    if (
      key === "difficulty" &&
      !["trivial", "easy", "medium", "hard", "deadly"].includes(String(value))
    )
      throw new CampaignError(400, "Invalid difficulty.");
  }
}
function defaults(kind: string) {
  const out: Record<string, unknown> = {};
  for (const f of fields[kind] ?? [])
    out[f] = ["tags", "conditions", "monsterIds"].includes(f)
      ? []
      : numbers.includes(f)
        ? 10
        : "";
  for (const child of children[kind] ?? []) out[child] = [];
  if (kind === "encounters") out.difficulty = "medium";
  if (kind === "combatants") out.kind = "monster";
  if (["gmnotes", "encounters"].includes(kind))
    out.createdAt = new Date().toISOString();
  return out;
}
export function applyChange(current: unknown, change: Change): unknown {
  if (!WRITABLE.includes(change.dataset))
    throw new CampaignError(403, "Data set outside write scope.");
  if (
    !["create", "update", "delete"].includes(change.operation) ||
    typeof change.reason !== "string" ||
    !change.reason.trim() ||
    change.reason.length > 1000
  )
    throw new CampaignError(400, "Invalid operation or reason.");
  if (revision(current) !== change.revision)
    throw new CampaignError(409, "Data changed. Read again before editing.");
  const root = structuredClone(current);
  let list: unknown[] | null = Array.isArray(root) ? root : null;
  let kind = change.dataset;
  let target: Record<string, unknown> | undefined;
  let parentFound = false;
  const visit = (node: unknown, nodeKind: string): void => {
    if (Array.isArray(node)) {
      node.forEach((v) => visit(v, nodeKind));
      return;
    }
    if (!object(node)) return;
    if (
      node.id === (change.operation === "create" ? change.parentId : change.id)
    ) {
      if (change.operation === "create") {
        if (!(children[nodeKind] ?? []).includes(change.collection ?? ""))
          throw new CampaignError(400, "Invalid child collection.");
        list = node[change.collection!] as unknown[];
        kind = change.collection!;
        parentFound = true;
      } else {
        target = node;
        kind = nodeKind;
      }
    }
    for (const child of children[nodeKind] ?? []) {
      const items = node[child];
      if (Array.isArray(items)) {
        if (
          change.operation !== "create" &&
          items.some((v) => object(v) && v.id === change.id)
        )
          list = items;
        visit(items, child);
      }
    }
  };
  visit(root, change.dataset);
  if (change.operation === "create") {
    if (!list || (change.dataset === "world" && !change.parentId))
      throw new CampaignError(
        400,
        "Choose a parent. Replacing the world is blocked.",
      );
    if (change.parentId && !parentFound)
      throw new CampaignError(404, "Parent not found.");
    if (!object(change.fields))
      throw new CampaignError(400, "Fields required.");
    validate(kind, change.fields);
    list.push({ ...defaults(kind), ...change.fields, id: randomUUID() });
  } else {
    if (!change.id || !target) throw new CampaignError(404, "Entry not found.");
    if (change.operation === "delete") {
      if (
        !list ||
        (children[kind] ?? []).some(
          (k) => Array.isArray(target![k]) && (target![k] as unknown[]).length,
        )
      )
        throw new CampaignError(
          400,
          "Root and populated-container deletes are blocked.",
        );
      if (Array.isArray(target.sharedWith) && target.sharedWith.length)
        throw new CampaignError(403, "Unshare manually before deleting.");
      list.splice(list.indexOf(target), 1);
    } else {
      if (!object(change.fields) || !Object.keys(change.fields).length)
        throw new CampaignError(400, "Fields required.");
      validate(kind, change.fields);
      Object.assign(target, change.fields);
    }
  }
  if (Buffer.byteLength(JSON.stringify(root)) > 2_000_000)
    throw new CampaignError(400, "Data too large.");
  return root;
}
