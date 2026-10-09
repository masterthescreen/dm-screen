"use client";

import { useState } from "react";
import { Note } from "@/types";
import { uid } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash } from "lucide-react";

interface MyNotebookProps {
  notes: Note[];
  onChange: (notes: Note[]) => void;
}

export function MyNotebook({ notes, onChange }: MyNotebookProps) {
  const [draft, setDraft] = useState({ title: "", content: "" });

  const addNote = () => {
    if (!draft.title.trim()) return;
    const note: Note = { id: uid(), title: draft.title, content: draft.content, createdAt: new Date().toISOString() };
    onChange([note, ...notes]);
    setDraft({ title: "", content: "" });
  };

  const removeNote = (id: string) => onChange(notes.filter((n) => n.id !== id));

  return (
    <div className="space-y-5">
      <div className="space-y-2 p-4 border rounded-md bg-card/50">
        <Input
          placeholder="Note title"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <Textarea
          rows={3}
          placeholder="What does your character want to remember?"
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
        />
        <Button size="sm" onClick={addNote} disabled={!draft.title.trim()}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Note
        </Button>
      </div>

      <div className="space-y-3">
        {notes.length === 0 && <p className="text-sm text-muted-foreground italic font-accent">Your notebook is empty.</p>}
        {notes.map((note) => (
          <Card key={note.id} className={note.fromGM ? "border-accent/60 bg-accent/5" : undefined}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-display">{note.title}</CardTitle>
                {note.fromGM && (
                  <Badge variant="outline" className="text-[10px] border-accent text-accent">
                    From GM
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeNote(note.id)}>
                <Trash className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
