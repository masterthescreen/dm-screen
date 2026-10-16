"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, RotateCcw, Send, Sparkles } from "lucide-react";
import { useMe } from "@/components/me-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type Message = { role: "nyxi" | "you"; text: string };
const greeting: Message = {
  role: "nyxi",
  text: "Hello, trouble. 💜 Pull up a chair. Shall we untangle a plot, invent someone suspicious, or make the next encounter delightfully inconvenient?",
};
const prompts = ["Catch me up", "Give me an NPC", "Spice up an encounter"];
const sample = {
  place: "Briarhaven",
  mystery: "The bell in the abandoned watchtower rings at midnight, but its clapper is missing.",
  npc: "Mira Thistle, a candle seller who buys maps of places that no longer exist.",
};

function demoReply(prompt: string): string {
  if (/npc|character|person/i.test(prompt)) {
    return "Oh, darling, meet " + sample.npc + "\n\nShe is charming, impeccably dressed, and much too interested in your party's travel plans. Her opening line: ‘Tell me where you've been. I'll tell you whether it still exists.’\n\nInvented hook: one of her candles burns blue near a forgotten doorway. Keep her helpful, suspicious, or both—you pick.\n\nSource: sample NPC card; the hook is a new suggestion.";
  }
  if (/encounter|combat|fight|monster/i.test(prompt)) {
    return "Let's give them a problem swords can't solve on their own, trouble.\n\nAt the watchtower, three stolen bells float over a flooded stairwell. Every round, one rings and the water rises. The party can silence a bell, rescue a trapped courier, or chase the fleeing thief. Deliciously inconvenient choices.\n\nThis is an invented encounter inspired by the sample watchtower mystery. Tune the enemies and difficulty to your party; I don't have their levels.";
  }
  if (/catch|recap|summary|lore|world|bell/i.test(prompt)) {
    return "Here's our little tangle, love:\n\n• Place: " + sample.place + ".\n• Mystery: " + sample.mystery + "\n• Person of interest: " + sample.npc + "\n\nMy suggestion? Let Mira recognize the sound before anyone tells her about it. A tiny slip, a lovely raised eyebrow, and suddenly the party has questions.\n\nSource: sample campaign cards. Mira's reaction is a new suggestion.";
  }
  return "I like the spark, trouble. 💜 This preview uses a few scripted replies, so I can't actually reason about that request yet.\n\nTry ‘Catch me up,’ ‘Give me an NPC,’ or ‘Spice up an encounter’ to sample my voice. The future connected version will work with the campaign context you choose.";
}

export function NyxiSidebar() {
  const { me } = useMe();
  return me?.role === "gm" ? <NyxiPreview /> : null;
}

function NyxiPreview() {
  const [expanded, setExpanded] = useState(true);
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [draft, setDraft] = useState("");

  function send(text: string) {
    const clean = text.trim().slice(0, 1000);
    if (!clean) return;
    setMessages((previous) => [
      ...previous,
      { role: "you", text: clean } as Message,
      { role: "nyxi", text: demoReply(clean) } as Message,
    ].slice(-40));
    setDraft("");
  }

  const content = <Conversation messages={messages} draft={draft} setDraft={setDraft} send={send}
    reset={() => { setMessages([greeting]); setDraft(""); }} />;

  return (
    <>
      <aside aria-label="Nyxi co-DM preview" className={expanded
        ? "sticky top-0 hidden h-dvh w-96 shrink-0 flex-col border-l border-border bg-card xl:flex"
        : "sticky top-0 hidden h-dvh w-16 shrink-0 flex-col items-center border-l border-border bg-card py-5 xl:flex"}>
        {expanded ? (
          <>
            <header className="flex items-center justify-between border-b p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles aria-hidden="true" className="h-5 w-5" /></span>
                <div><h2 className="font-display text-xl text-primary">Nyxi</h2><p className="text-xs text-muted-foreground">Your co-DM, with a little mischief</p></div>
              </div>
              <Button variant="ghost" size="icon" aria-label="Collapse Nyxi sidebar" onClick={() => setExpanded(false)}><ChevronRight aria-hidden="true" /></Button>
            </header>
            {content}
          </>
        ) : <Button variant="ghost" size="icon" aria-label="Open Nyxi sidebar" onClick={() => setExpanded(true)}><Sparkles aria-hidden="true" /></Button>}
      </aside>
      <Sheet>
        <SheetTrigger asChild>
          <Button className="fixed bottom-5 right-5 z-40 rounded-full shadow-lg xl:hidden"><Sparkles aria-hidden="true" />Ask Nyxi</Button>
        </SheetTrigger>
        <SheetContent className="flex h-dvh w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b p-5 pr-12 text-left">
            <SheetTitle className="font-display text-xl text-primary">Nyxi</SheetTitle>
            <SheetDescription>Your co-DM, with a little mischief</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Conversation({ messages, draft, setDraft, send, reset }: {
  messages: Message[];
  draft: string;
  setDraft: (value: string) => void;
  send: (value: string) => void;
  reset: () => void;
}) {
  const inputId = useId();
  const transcript = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = transcript.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 border-b bg-secondary/30 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">Sample-data preview</span>
          <Button variant="ghost" size="icon" aria-label="Reset preview conversation" onClick={reset}><RotateCcw aria-hidden="true" /></Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">Scripted replies. No AI service or campaign database connected. This conversation disappears when you reload.</p>
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-primary">Peek at our sample campaign</summary>
          <div className="mt-2 space-y-2 rounded-md border bg-background p-3">
            <p><strong>{sample.place}</strong></p><p>{sample.mystery}</p><p>{sample.npc}</p>
          </div>
        </details>
      </div>
      <div ref={transcript} role="log" aria-label="Conversation with Nyxi" aria-live="polite" aria-relevant="additions" tabIndex={0}
        className="scrollbar-ornate min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={index} className={message.role === "you" ? "ml-7 rounded-xl bg-secondary p-3" : "mr-3 rounded-xl border border-primary/15 bg-primary/5 p-3"}>
            <p className="mb-2 text-xs font-semibold text-primary">{message.role === "nyxi" ? "Nyxi ✧" : "You"}</p>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3 border-t bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => <button key={prompt} type="button" onClick={() => send(prompt)}
            className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{prompt}</button>)}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); send(draft); }} className="space-y-2">
          <label htmlFor={inputId} className="text-xs font-medium">What's brewing, Game Master?</label>
          <div className="flex gap-2">
            <input id={inputId} value={draft} maxLength={1000} onChange={(event) => setDraft(event.target.value)}
              placeholder="A plot twist? Someone suspicious?"
              className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send message"><Send aria-hidden="true" /></Button>
          </div>
        </form>
        <p className="text-xs text-muted-foreground">Ideas only. You decide what becomes canon.</p>
      </div>
    </div>
  );
}
