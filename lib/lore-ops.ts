import { City, Continent, Kingdom, Person, Shop, World } from "@/types";
import { Selection } from "@/components/lore/lore-tree";
import { uid } from "@/lib/storage";

export function findEntity(world: World, sel: Selection) {
  if (sel.level === "world") return world;
  const continent = world.continents.find((c) => c.id === sel.continentId);
  if (sel.level === "continent") return continent ?? null;
  const kingdom = continent?.kingdoms.find((k) => k.id === sel.kingdomId);
  if (sel.level === "kingdom") return kingdom ?? null;
  const city = kingdom?.cities.find((c) => c.id === sel.cityId);
  if (sel.level === "city") return city ?? null;
  if (sel.level === "shop") return city?.shops.find((s) => s.id === sel.shopId) ?? null;
  if (sel.level === "person") return city?.people.find((p) => p.id === sel.personId) ?? null;
  return null;
}

export function updateWorld(world: World, sel: Selection, patch: Record<string, unknown>): World {
  const next = structuredClone(world);
  if (sel.level === "world") {
    Object.assign(next, patch);
    return next;
  }
  const continent = next.continents.find((c) => c.id === sel.continentId);
  if (!continent) return next;
  if (sel.level === "continent") {
    Object.assign(continent, patch);
    return next;
  }
  const kingdom = continent.kingdoms.find((k) => k.id === sel.kingdomId);
  if (!kingdom) return next;
  if (sel.level === "kingdom") {
    Object.assign(kingdom, patch);
    return next;
  }
  const city = kingdom.cities.find((c) => c.id === sel.cityId);
  if (!city) return next;
  if (sel.level === "city") {
    Object.assign(city, patch);
    return next;
  }
  if (sel.level === "shop") {
    const shop = city.shops.find((s) => s.id === sel.shopId);
    if (shop) Object.assign(shop, patch);
  }
  if (sel.level === "person") {
    const person = city.people.find((p) => p.id === sel.personId);
    if (person) Object.assign(person, patch);
  }
  return next;
}

export function addEntity(world: World, level: Selection["level"], parent: Selection): World {
  const next = structuredClone(world);
  if (level === "continent") {
    next.continents.push({ id: uid(), name: "New Continent", description: "", kingdoms: [] } as Continent);
  } else if (level === "kingdom") {
    const continent = next.continents.find((c) => c.id === parent.continentId);
    continent?.kingdoms.push({
      id: uid(),
      name: "New Kingdom",
      description: "",
      ruler: "",
      cities: [],
    } as Kingdom);
  } else if (level === "city") {
    const continent = next.continents.find((c) => c.id === parent.continentId);
    const kingdom = continent?.kingdoms.find((k) => k.id === parent.kingdomId);
    kingdom?.cities.push({
      id: uid(),
      name: "New City",
      description: "",
      population: "",
      shops: [],
      people: [],
    } as City);
  } else if (level === "shop") {
    const continent = next.continents.find((c) => c.id === parent.continentId);
    const kingdom = continent?.kingdoms.find((k) => k.id === parent.kingdomId);
    const city = kingdom?.cities.find((c) => c.id === parent.cityId);
    city?.shops.push({
      id: uid(),
      name: "New Shop",
      type: "",
      description: "",
      proprietor: "",
    } as Shop);
  } else if (level === "person") {
    const continent = next.continents.find((c) => c.id === parent.continentId);
    const kingdom = continent?.kingdoms.find((k) => k.id === parent.kingdomId);
    const city = kingdom?.cities.find((c) => c.id === parent.cityId);
    city?.people.push({
      id: uid(),
      name: "New Person",
      role: "",
      description: "",
      secrets: "",
    } as Person);
  }
  return next;
}

export function deleteEntity(world: World, sel: Selection): World {
  const next = structuredClone(world);
  if (sel.level === "continent") {
    next.continents = next.continents.filter((c) => c.id !== sel.continentId);
  } else if (sel.level === "kingdom") {
    const continent = next.continents.find((c) => c.id === sel.continentId);
    if (continent) continent.kingdoms = continent.kingdoms.filter((k) => k.id !== sel.kingdomId);
  } else if (sel.level === "city") {
    const kingdom = next.continents
      .find((c) => c.id === sel.continentId)
      ?.kingdoms.find((k) => k.id === sel.kingdomId);
    if (kingdom) kingdom.cities = kingdom.cities.filter((c) => c.id !== sel.cityId);
  } else if (sel.level === "shop") {
    const city = next.continents
      .find((c) => c.id === sel.continentId)
      ?.kingdoms.find((k) => k.id === sel.kingdomId)
      ?.cities.find((c) => c.id === sel.cityId);
    if (city) city.shops = city.shops.filter((s) => s.id !== sel.shopId);
  } else if (sel.level === "person") {
    const city = next.continents
      .find((c) => c.id === sel.continentId)
      ?.kingdoms.find((k) => k.id === sel.kingdomId)
      ?.cities.find((c) => c.id === sel.cityId);
    if (city) city.people = city.people.filter((p) => p.id !== sel.personId);
  }
  return next;
}
