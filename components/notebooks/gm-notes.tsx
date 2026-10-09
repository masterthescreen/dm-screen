"use client";

import { useState } from "react";
import { GMNote, Player, Note } from "@/types";
import { uid } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash, Send } from "lucide-react";

interface GMNotesProps {
  notes: GMNote[];
  onChange: (notes: GMNote[]) => void;
  players: Player[];
  onSend: (playerId: string, note: Note) => void;
}

function blankNote(): GMNote {
  return { id: uid(), title: "", content: "", tags: [], createdAt: new Date().toISOString() };
}

export function GMNotes({ notes, onChange, players, onSend }: GMNotesProps) {
  const [draft, setDraft] = useState<GMNote>(blankNote());
  const [tagInput, setTagInput] = useState("");
  const [sendTarget, setSendTarget] = useState<Record<string, string>>({});

  const saveNote = () => {
    if (!draft.title.trim()) return;
    onChange([draft, ...notes]);
    setDraft(blankNote());
  };

  const deleteNote = (id: string) => onChange(notes.filter((n) => n.id !== id));

  const addTag = () => {
    if (!tagInput.trim()) return;
    setDraft({ ...draft, tags: [...draft.tags, tagInput.trim()] });
    setTagInput("");
  };

  const sendNote = (note: GMNote) => {
    const playerId = sendTarget[note.id];
    if (!playerId) return;
    onSend(playerId, {
      id: uid(),
      title: note.title,
      content: note.content,
      createdAt: new Date().toISOString(),
      fromGM: true,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="font-display text-lg font-semibold">New GM Note</h3>
        <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <Textarea
          rows={6}
          placeholder="Secret plots, session prep, campaign threads..."
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
        />
        <div className="flex gap-2">
          <Input
            placeholder="Add a tag (e.g. session-12)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
          />
          <Button variant="outline" onClick={addTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {draft.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {draft.tags.map((t, i) => (
              <Badge key={i} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        )}
        <Button onClick={saveNote} disabled={!draft.title.trim()}>
          Save Note
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-lg font-semibold">GM Journal ({notes.length})</h3>
        <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-ornate pr-1">
          {notes.length === 0 && <p className="text-sm text-muted-foreground italic font-accent">No notes yet.</p>}
          {notes.map((note) => (
            <Card key={note.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-base font-display">{note.title}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => deleteNote(note.id)}>
                  <Trash className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {note.tags.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
                {players.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    <Select
                      value={sendTarget[note.id] ?? ""}
                      onValueChange={(v) => setSendTarget({ ...sendTarget, [note.id]: v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Send to player..." />
                      </SelectTrigger>
                      <SelectContent>
                        {players.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.playerName} ({p.characterName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => sendNote(note)} disabled={!sendTarget[note.id]}>
                      <Send className="h-3.5 w-3.5 mr-1.5" /> Send
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
