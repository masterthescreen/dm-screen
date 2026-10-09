"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash, Share } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Selection } from "./lore-tree";
import { City, Continent, Kingdom, Person, Player, Shop, World } from "@/types";

type Entity = World | Continent | Kingdom | City | Shop | Person;

interface LoreDetailProps {
  selection: Selection;
  entity: Entity | null;
  onChange: (patch: Partial<Entity>) => void;
  onDelete: () => void;
  players: Player[];
}

const levelLabels: Record<Selection["level"], string> = {
  world: "World",
  continent: "Continent",
  kingdom: "Kingdom",
  city: "City",
  shop: "Shop",
  person: "Person",
};

export function LoreDetail({ selection, entity, onChange, onDelete, players }: LoreDetailProps) {
  if (!entity) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground italic font-accent">
        Select an entry from the codex tree.
      </div>
    );
  }

  const e = entity as unknown as Record<string, string>;
  const sharedWith: string[] = (entity as { sharedWith?: string[] }).sharedWith ?? [];

  const setShared = (ids: string[]) => onChange({ sharedWith: ids } as Partial<Entity>);
  const toggleShared = (playerId: string, on: boolean) =>
    setShared(on ? Array.from(new Set([...sharedWith, playerId])) : sharedWith.filter((id) => id !== playerId));

  return (
    <div className="p-8 max-w-2xl space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">{levelLabels[selection.level]}</p>
          <h2 className="font-display text-2xl font-bold mt-1">{e.name || "Untitled"}</h2>
        </div>
        {selection.level !== "world" && (
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input value={e.name || ""} onChange={(ev) => onChange({ name: ev.target.value } as Partial<Entity>)} />
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea
          rows={4}
          value={e.description || ""}
          onChange={(ev) => onChange({ description: ev.target.value } as Partial<Entity>)}
        />
      </div>

      {selection.level === "kingdom" && (
        <div className="space-y-1.5">
          <Label>Ruler</Label>
          <Input value={e.ruler || ""} onChange={(ev) => onChange({ ruler: ev.target.value } as Partial<Entity>)} />
        </div>
      )}

      {selection.level === "city" && (
        <div className="space-y-1.5">
          <Label>Population</Label>
          <Input
            value={e.population || ""}
            onChange={(ev) => onChange({ population: ev.target.value } as Partial<Entity>)}
          />
        </div>
      )}

      {selection.level === "shop" && (
        <>
          <div className="space-y-1.5">
            <Label>Shop type</Label>
            <Input value={e.type || ""} onChange={(ev) => onChange({ type: ev.target.value } as Partial<Entity>)} />
          </div>
          <div className="space-y-1.5">
            <Label>Proprietor</Label>
            <Input
              value={e.proprietor || ""}
              onChange={(ev) => onChange({ proprietor: ev.target.value } as Partial<Entity>)}
            />
          </div>
        </>
      )}

      {selection.level === "person" && (
        <>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Input value={e.role || ""} onChange={(ev) => onChange({ role: ev.target.value } as Partial<Entity>)} />
          </div>
          <div className="space-y-1.5">
            <Label>GM-only secrets</Label>
            <Textarea
              rows={3}
              value={e.secrets || ""}
              onChange={(ev) => onChange({ secrets: ev.target.value } as Partial<Entity>)}
              className="border-accent/50"
            />
          </div>
        </>
      )}

      <div className="rounded-md border border-border/70 bg-card/60 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold flex items-center gap-2">
            <Share className="h-4 w-4 text-accent" /> Share with players
          </h3>
          {players.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShared(players.map((p) => p.id))}>
                Everyone
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShared([])} disabled={sharedWith.length === 0}>
                Nobody
              </Button>
            </div>
          )}
        </div>
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add players in the Players section first, then choose who can see this entry.
          </p>
        ) : (
          <div className="space-y-2">
            {players.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={sharedWith.includes(p.id)}
                  onCheckedChange={(v) => toggleShared(p.id, v === true)}
                />
                <span>
                  {p.characterName || "Unnamed"} <span className="text-muted-foreground">({p.playerName})</span>
                </span>
              </label>
            ))}
            <p className="text-xs text-muted-foreground">
              Players see this entry&apos;s name and description{selection.level === "person" ? " (never the GM-only secrets)" : ""}
              . Sharing one entry doesn&apos;t share the entries inside it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
