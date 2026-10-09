import { World } from "@/types";

export type LoreLevel = "World" | "Continent" | "Kingdom" | "City" | "Shop" | "Person";

export interface SharedLoreItem {
  id: string;
  level: LoreLevel;
  name: string;
  path: string; // e.g. "Veythara › Caldrun › Hallowmere"
  description: string;
  details: { label: string; value: string }[];
}

function isShared(sharedWith: string[] | undefined, playerId: string) {
  return !!sharedWith && sharedWith.includes(playerId);
}

function detail(label: string, value: string | undefined) {
  return value && value.trim() ? [{ label, value }] : [];
}

/**
 * Collects every lore entry shared with the given player. Only player-safe
 * fields are copied out — e.g. a person's GM-only `secrets` are never included.
 */
export function collectSharedLore(world: World | null | undefined, playerId: string): SharedLoreItem[] {
  if (!world) return [];
  const items: SharedLoreItem[] = [];

  if (isShared(world.sharedWith, playerId)) {
    items.push({ id: world.id, level: "World", name: world.name, path: "", description: world.description, details: [] });
  }

  for (const continent of world.continents ?? []) {
    if (isShared(continent.sharedWith, playerId)) {
      items.push({
        id: continent.id,
        level: "Continent",
        name: continent.name,
        path: world.name,
        description: continent.description,
        details: [],
      });
    }
    for (const kingdom of continent.kingdoms ?? []) {
      const kingdomPath = [continent.name].join(" › ");
      if (isShared(kingdom.sharedWith, playerId)) {
        items.push({
          id: kingdom.id,
          level: "Kingdom",
          name: kingdom.name,
          path: kingdomPath,
          description: kingdom.description,
          details: detail("Ruler", kingdom.ruler),
        });
      }
      for (const city of kingdom.cities ?? []) {
        const cityPath = [continent.name, kingdom.name].join(" › ");
        if (isShared(city.sharedWith, playerId)) {
          items.push({
            id: city.id,
            level: "City",
            name: city.name,
            path: cityPath,
            description: city.description,
            details: detail("Population", city.population),
          });
        }
        const innerPath = [continent.name, kingdom.name, city.name].join(" › ");
        for (const shop of city.shops ?? []) {
          if (isShared(shop.sharedWith, playerId)) {
            items.push({
              id: shop.id,
              level: "Shop",
              name: shop.name,
              path: innerPath,
              description: shop.description,
              details: [...detail("Type", shop.type), ...detail("Proprietor", shop.proprietor)],
            });
          }
        }
        for (const person of city.people ?? []) {
          if (isShared(person.sharedWith, playerId)) {
            items.push({
              id: person.id,
              level: "Person",
              name: person.name,
              path: innerPath,
              description: person.description,
              details: detail("Role", person.role),
            });
          }
        }
      }
    }
  }

  return items;
}
