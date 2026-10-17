"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, RotateCcw, Send, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/components/me-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Message = { role: "nyxi" | "you"; text: string };
const greeting: Message = {
  role: "nyxi",
  text: "Hello, trouble. 💜 Pull up a chair. Shall we untangle a plot, invent someone suspicious, or make the next encounter delightfully inconvenient?",
};
const prompts = ["Catch me up", "Give me an NPC", "Spice up an encounter"];
export function NyxiSidebar() {
  const { me } = useMe();
  return me?.role === "gm" ? <NyxiAssistant /> : null;
}

function NyxiAssistant() {
  const [expanded, setExpanded] = useState(true);
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const show = (event: Event) =>
      setError(String((event as CustomEvent).detail));
    window.addEventListener("campaign-save-error", show);
    return () => window.removeEventListener("campaign-save-error", show);
  }, []);
  const [changes, setChanges] = useState<
    { id: string; reason: string; state_key: string }[]
  >([]);
  async function refreshHistory() {
    try {
      const data = await api<{ changes: typeof changes }>("/api/nyxi/history");
      setChanges(data.changes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load history.");
    }
  }
  async function undoChange(id: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/nyxi/undo", { method: "POST", body: { id } });
      await refreshHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not undo change.");
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string) {
    const clean = text.trim().slice(0, 1000);
    if (!clean || busy) return;
    const next = [...messages, { role: "you" as const, text: clean }].slice(
      -30,
    );
    setMessages(next);
    setDraft("");
    setError("");
    setBusy(true);
    try {
      const data = await api<{ reply: string }>("/api/nyxi/chat", {
        method: "POST",
        body: {
          messages: next
            .filter((m) => m !== greeting)
            .map((m) => ({
              role: m.role === "you" ? "user" : "assistant",
              content: m.text,
            })),
        },
      });
      setMessages([...next, { role: "nyxi", text: data.reply }]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Nyxi couldn't connect. Check change history before retrying.",
      );
    } finally {
      setBusy(false);
      await refreshHistory();
    }
  }
  const content = (
    <>
      {error && (
        <p role="alert" className="p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="px-4 py-2 text-sm">
          Nyxi is working…
        </p>
      )}
      <details className="border-b p-3 text-xs">
        <summary onClick={() => void refreshHistory()}>
          Change history & undo
        </summary>
        <Button variant="ghost" size="sm" onClick={() => void refreshHistory()}>
          Refresh
        </Button>
        <div className="max-h-44 overflow-auto">
          {changes.map((c) => (
            <div key={c.id} className="border-t py-2">
              <p>
                {c.state_key}: {c.reason}
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void undoChange(c.id)}
              >
                Undo
              </Button>
            </div>
          ))}
        </div>
      </details>
      <Conversation
        messages={messages}
        draft={draft}
        setDraft={setDraft}
        send={busy ? () => {} : send}
        reset={() => {
          if (!busy) {
            setMessages([greeting]);
            setDraft("");
          }
        }}
      />
    </>
  );

  return (
    <>
      <aside
        aria-label="Nyxi co-DM"
        className={
          expanded
            ? "sticky top-0 hidden h-dvh w-96 shrink-0 flex-col border-l border-border bg-card xl:flex"
            : "sticky top-0 hidden h-dvh w-16 shrink-0 flex-col items-center border-l border-border bg-card py-5 xl:flex"
        }
      >
        {expanded ? (
          <>
            <header className="flex items-center justify-between border-b p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl text-primary">Nyxi</h2>
                  <p className="text-xs text-muted-foreground">
                    Your co-DM, with a little mischief
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Collapse Nyxi sidebar"
                onClick={() => setExpanded(false)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </header>
            {content}
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open Nyxi sidebar"
            onClick={() => setExpanded(true)}
          >
            <Sparkles aria-hidden="true" />
          </Button>
        )}
      </aside>
      <Sheet>
        <SheetTrigger asChild>
          <Button className="fixed bottom-5 right-5 z-40 rounded-full shadow-lg xl:hidden">
            <Sparkles aria-hidden="true" />
            Ask Nyxi
          </Button>
        </SheetTrigger>
        <SheetContent className="flex h-dvh w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b p-5 pr-12 text-left">
            <SheetTitle className="font-display text-xl text-primary">
              Nyxi
            </SheetTitle>
            <SheetDescription>
              Your co-DM, with a little mischief
            </SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Conversation({
  messages,
  draft,
  setDraft,
  send,
  reset,
}: {
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
          <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
            Campaign assistant
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Reset conversation"
            onClick={reset}
          >
            <RotateCcw aria-hidden="true" />
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Connected replies use your GM campaign data. Requested edits are
          logged and recoverable. Chat clears on reload; saved campaign changes
          remain.
        </p>
      </div>
      <div
        ref={transcript}
        role="log"
        aria-label="Conversation with Nyxi"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
        className="scrollbar-ornate min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "you"
                ? "ml-7 rounded-xl bg-secondary p-3"
                : "mr-3 rounded-xl border border-primary/15 bg-primary/5 p-3"
            }
          >
            <p className="mb-2 text-xs font-semibold text-primary">
              {message.role === "nyxi" ? "Nyxi ✧" : "You"}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.text}
            </p>
          </div>
        ))}
      </div>
      <div className="space-y-3 border-t bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => send(prompt)}
              className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {prompt}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
          className="space-y-2"
        >
          <label htmlFor={inputId} className="text-xs font-medium">
            What's brewing, Game Master?
          </label>
          <div className="flex gap-2">
            <input
              id={inputId}
              value={draft}
              maxLength={1000}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="A plot twist? Someone suspicious?"
              className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!draft.trim()}
              aria-label="Send message"
            >
              <Send aria-hidden="true" />
            </Button>
          </div>
        </form>
        <p className="text-xs text-muted-foreground">
          Explicit campaign edits execute automatically. One entry per turn; no
          mass deletes.
        </p>
      </div>
    </div>
  );
}
