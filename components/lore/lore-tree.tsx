"use client";

import { useState } from "react";
import { World } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Globe, Map, Crown, Building, Package, User, Plus, Share } from "lucide-react";

export interface Selection {
  level: "world" | "continent" | "kingdom" | "city" | "shop" | "person";
  continentId?: string;
  kingdomId?: string;
  cityId?: string;
  shopId?: string;
  personId?: string;
}

interface LoreTreeProps {
  world: World;
  selection: Selection;
  onSelect: (sel: Selection) => void;
  onAdd: (level: Selection["level"], parent: Selection) => void;
}

function Row({
  depth,
  icon: Icon,
  label,
  shared,
  active,
  expandable,
  expanded,
  onToggle,
  onClick,
}: {
  depth: number;
  icon: React.ElementType;
  label: string;
  shared?: boolean;
  active: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded px-2 py-1.5 text-sm cursor-pointer group",
        active ? "bg-primary text-primary-foreground" : "hover:bg-accent/10"
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={onClick}
    >
      {expandable ? (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          className="shrink-0"
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
      <span className="truncate">{label}</span>
      {shared && <Share className="h-3 w-3 shrink-0 opacity-70 ml-auto" aria-label="Shared with players" />}
    </div>
  );
}

export function LoreTree({ world, selection, onSelect, onAdd }: LoreTreeProps) {
  const [openContinents, setOpenContinents] = useState<Record<string, boolean>>({});
  const [openKingdoms, setOpenKingdoms] = useState<Record<string, boolean>>({});
  const [openCities, setOpenCities] = useState<Record<string, boolean>>({});

  const toggle = (map: Record<string, boolean>, set: (v: Record<string, boolean>) => void, id: string) =>
    set({ ...map, [id]: !map[id] });

  return (
    <div className="text-sm">
      <Row
        depth={0}
        icon={Globe}
        label={world.name}
                    shared={!!world.sharedWith?.length}
        active={selection.level === "world"}
        onClick={() => onSelect({ level: "world" })}
      />
      <button
        onClick={() => onAdd("continent", { level: "world" })}
        className="flex items-center gap-1.5 pl-6 py-1 text-xs text-accent hover:underline"
      >
        <Plus className="h-3 w-3" /> Add continent
      </button>

      {world.continents.map((continent) => (
        <div key={continent.id}>
          <Row
            depth={1}
            icon={Map}
            label={continent.name}
                    shared={!!continent.sharedWith?.length}
            active={selection.level === "continent" && selection.continentId === continent.id}
            expandable
            expanded={!!openContinents[continent.id]}
            onToggle={() => toggle(openContinents, setOpenContinents, continent.id)}
            onClick={() => onSelect({ level: "continent", continentId: continent.id })}
          />
          {openContinents[continent.id] && (
            <>
              <button
                onClick={() => onAdd("kingdom", { level: "continent", continentId: continent.id })}
                className="flex items-center gap-1.5 py-1 text-xs text-accent hover:underline"
                style={{ paddingLeft: "40px" }}
              >
                <Plus className="h-3 w-3" /> Add kingdom
              </button>
              {continent.kingdoms.map((kingdom) => (
                <div key={kingdom.id}>
                  <Row
                    depth={2}
                    icon={Crown}
                    label={kingdom.name}
                    shared={!!kingdom.sharedWith?.length}
                    active={selection.level === "kingdom" && selection.kingdomId === kingdom.id}
                    expandable
                    expanded={!!openKingdoms[kingdom.id]}
                    onToggle={() => toggle(openKingdoms, setOpenKingdoms, kingdom.id)}
                    onClick={() =>
                      onSelect({ level: "kingdom", continentId: continent.id, kingdomId: kingdom.id })
                    }
                  />
                  {openKingdoms[kingdom.id] && (
                    <>
                      <button
                        onClick={() =>
                          onAdd("city", { level: "kingdom", continentId: continent.id, kingdomId: kingdom.id })
                        }
                        className="flex items-center gap-1.5 py-1 text-xs text-accent hover:underline"
                        style={{ paddingLeft: "56px" }}
                      >
                        <Plus className="h-3 w-3" /> Add city
                      </button>
                      {kingdom.cities.map((city) => (
                        <div key={city.id}>
                          <Row
                            depth={3}
                            icon={Building}
                            label={city.name}
                    shared={!!city.sharedWith?.length}
                            active={selection.level === "city" && selection.cityId === city.id}
                            expandable
                            expanded={!!openCities[city.id]}
                            onToggle={() => toggle(openCities, setOpenCities, city.id)}
                            onClick={() =>
                              onSelect({
                                level: "city",
                                continentId: continent.id,
                                kingdomId: kingdom.id,
                                cityId: city.id,
                              })
                            }
                          />
                          {openCities[city.id] && (
                            <>
                              <button
                                onClick={() =>
                                  onAdd("shop", {
                                    level: "city",
                                    continentId: continent.id,
                                    kingdomId: kingdom.id,
                                    cityId: city.id,
                                  })
                                }
                                className="flex items-center gap-1.5 py-1 text-xs text-accent hover:underline"
                                style={{ paddingLeft: "72px" }}
                              >
                                <Plus className="h-3 w-3" /> Add shop
                              </button>
                              {city.shops.map((shop) => (
                                <Row
                                  key={shop.id}
                                  depth={4}
                                  icon={Package}
                                  label={shop.name}
                    shared={!!shop.sharedWith?.length}
                                  active={selection.level === "shop" && selection.shopId === shop.id}
                                  onClick={() =>
                                    onSelect({
                                      level: "shop",
                                      continentId: continent.id,
                                      kingdomId: kingdom.id,
                                      cityId: city.id,
                                      shopId: shop.id,
                                    })
                                  }
                                />
                              ))}
                              <button
                                onClick={() =>
                                  onAdd("person", {
                                    level: "city",
                                    continentId: continent.id,
                                    kingdomId: kingdom.id,
                                    cityId: city.id,
                                  })
                                }
                                className="flex items-center gap-1.5 py-1 text-xs text-accent hover:underline"
                                style={{ paddingLeft: "72px" }}
                              >
                                <Plus className="h-3 w-3" /> Add person
                              </button>
                              {city.people.map((person) => (
                                <Row
                                  key={person.id}
                                  depth={4}
                                  icon={User}
                                  label={person.name}
                    shared={!!person.sharedWith?.length}
                                  active={selection.level === "person" && selection.personId === person.id}
                                  onClick={() =>
                                    onSelect({
                                      level: "person",
                                      continentId: continent.id,
                                      kingdomId: kingdom.id,
                                      cityId: city.id,
                                      personId: person.id,
                                    })
                                  }
                                />
                              ))}
                            </>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
