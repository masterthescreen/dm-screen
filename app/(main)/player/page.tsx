"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useMe } from "@/components/me-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CharacterSheetView } from "@/components/player/character-sheet-view";
import { MyNotebook } from "@/components/player/my-notebook";
import { SharedLoreView } from "@/components/player/shared-lore-view";
import { AccountView } from "@/components/player/account-view";
import { KeyRound, Loader2 } from "lucide-react";

export default function PlayerPage() {
  const { me, loaded, refresh } = useMe();
  const [tab, setTab] = useState<string | null>(null);

  if (!loaded || !me || me.role !== "player") {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const { player, lore } = me;
  const hasPassword = !!player.username;
  const activeTab = tab ?? (player.mustChangePassword ? "account" : "character");

  const saveCharacter = async (patch: { currentHp?: number; equipment?: string; backstory?: string }) => {
    await api("/api/me/character", { method: "PATCH", body: patch });
    await refresh();
  };

  const addNote = async (title: string, content: string) => {
    await api("/api/me/notes", { method: "POST", body: { title, content } });
    await refresh();
  };

  const removeNote = async (id: string) => {
    await api(`/api/me/notes/${id}`, { method: "DELETE" });
    await refresh();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {player.mustChangePassword && (
        <Alert className="mb-6 border-accent/60">
          <KeyRound className="h-4 w-4" />
          <AlertDescription>
            Your GM reset your password. Choose a new one in the <strong>Account</strong> tab to keep your account safe.
          </AlertDescription>
        </Alert>
      )}
      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="character">Character Sheet</TabsTrigger>
          <TabsTrigger value="notebook">My Notebook ({player.notes.length})</TabsTrigger>
          <TabsTrigger value="lore">Lore ({lore.length})</TabsTrigger>
          {hasPassword && <TabsTrigger value="account">Account</TabsTrigger>}
        </TabsList>

        <TabsContent value="character">
          <CharacterSheetView player={player} onSave={saveCharacter} />
        </TabsContent>

        <TabsContent value="notebook">
          <MyNotebook notes={player.notes} onAdd={addNote} onRemove={removeNote} />
        </TabsContent>

        <TabsContent value="lore">
          <SharedLoreView items={lore} />
        </TabsContent>

        {hasPassword && (
          <TabsContent value="account">
            <AccountView
              player={player}
              onChanged={async () => {
                setTab("account"); // stay put so the confirmation message is visible
                await refresh();
              }}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
