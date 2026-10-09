"use client";

import { useRef, useState } from "react";
import { Monster } from "@/types";
import { uid } from "@/lib/storage";
import { parseCSV, rowsToObjects } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Plus, Trash, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MonsterListProps {
  monsters: Monster[];
  onChange: (monsters: Monster[]) => void;
}

function blankMonster(): Monster {
  return { id: uid(), name: "", type: "", cr: "", hp: 10, ac: 10, speed: "30 ft", stats: "", abilities: "", notes: "" };
}

export function MonsterList({ monsters, onChange }: MonsterListProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Monster>(blankMonster());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  const handleCSV = (file: File) => {
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const rows = parseCSV(text);
        const objects = rowsToObjects(rows);
        const imported: Monster[] = objects.map((o) => ({
          id: uid(),
          name: o.name || "Unnamed",
          type: o.type || "",
          cr: o.cr || "",
          hp: parseInt(o.hp || "0", 10) || 0,
          ac: parseInt(o.ac || "0", 10) || 0,
          speed: o.speed || "",
          stats: o.stats || "",
          abilities: o.abilities || "",
          notes: o.notes || "",
        }));
        if (imported.length === 0) {
          setCsvError("No rows found. Expected headers: name, type, cr, hp, ac, speed, stats, abilities, notes");
          return;
        }
        onChange([...monsters, ...imported]);
      } catch {
        setCsvError("Could not parse that CSV file.");
      }
    };
    reader.readAsText(file);
  };

  const saveDraft = () => {
    onChange([...monsters, { ...draft, id: uid() }]);
    setDraft(blankMonster());
    setDialogOpen(false);
  };

  const removeMonster = (id: string) => onChange(monsters.filter((m) => m.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Monster Manual</h3>
          <p className="text-xs text-muted-foreground">{monsters.length} creatures catalogued</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCSV(file);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" /> Upload CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setDraft(blankMonster())}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Monster
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">New Monster</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                <div className="col-span-2 space-y-1">
                  <Label>Name</Label>
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Input value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>CR</Label>
                  <Input value={draft.cr} onChange={(e) => setDraft({ ...draft, cr: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>HP</Label>
                  <Input
                    type="number"
                    value={draft.hp}
                    onChange={(e) => setDraft({ ...draft, hp: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>AC</Label>
                  <Input
                    type="number"
                    value={draft.ac}
                    onChange={(e) => setDraft({ ...draft, ac: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Speed</Label>
                  <Input value={draft.speed} onChange={(e) => setDraft({ ...draft, speed: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Stat block (STR/DEX/CON/INT/WIS/CHA)</Label>
                  <Input value={draft.stats} onChange={(e) => setDraft({ ...draft, stats: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Abilities</Label>
                  <Textarea rows={2} value={draft.abilities} onChange={(e) => setDraft({ ...draft, abilities: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Notes</Label>
                  <Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
                </div>
              </div>
              <Button onClick={saveDraft} disabled={!draft.name.trim()}>
                Save Monster
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {csvError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>CSV import issue</AlertTitle>
          <AlertDescription>{csvError}</AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground font-accent italic">
        CSV columns expected: name, type, cr, hp, ac, speed, stats, abilities, notes
      </p>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>CR</TableHead>
              <TableHead>HP</TableHead>
              <TableHead>AC</TableHead>
              <TableHead>Speed</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {monsters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No monsters yet. Upload a CSV or add one manually.
                </TableCell>
              </TableRow>
            ) : (
              monsters.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.type}</TableCell>
                  <TableCell>{m.cr}</TableCell>
                  <TableCell>{m.hp}</TableCell>
                  <TableCell>{m.ac}</TableCell>
                  <TableCell>{m.speed}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => removeMonster(m.id)}>
                      <Trash className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
