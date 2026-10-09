"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Swords, Dices, FileText, Scroll, User, Users, Crown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth";
import { useServerState } from "@/lib/server-storage";
import { Player } from "@/types";

const gmNavItems = [
  { href: "/", label: "The Hearth", icon: Scroll },
  { href: "/lore", label: "Lore Codex", icon: BookOpen },
  { href: "/players", label: "Players", icon: Users },
  { href: "/combat", label: "Combat Table", icon: Swords },
  { href: "/dice", label: "Dice Tower", icon: Dices },
  { href: "/notebooks", label: "GM Notes", icon: FileText },
];

const playerNavItems = [
  { href: "/player", label: "My Character", icon: User },
  { href: "/dice", label: "Dice Tower", icon: Dices },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useSession();
  const [players] = useServerState<Player[]>("codex.players", []);

  const isGm = session?.role === "gm";
  const navItems = isGm ? gmNavItems : playerNavItems;
  const currentPlayer = players.find((p) => p.id === session?.playerId);

  const logout = () => {
    setSession(null);
    router.replace("/login");
  };

  return (
    <aside className="w-64 shrink-0 border-r border-border/70 bg-secondary/40 backdrop-blur-sm p-5 flex flex-col gap-1 min-h-screen">
      <div className="mb-8 px-1">
        <h1 className="font-display text-2xl font-bold text-primary leading-tight">Codex</h1>
        <p className="font-accent text-sm text-muted-foreground italic mt-0.5">the GM&apos;s companion</p>
      </div>
      {navItems.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors border border-transparent",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "hover:bg-accent/10 hover:border-accent/30 text-foreground/80"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto pt-6 px-1 space-y-3">
        <p className="text-xs text-muted-foreground font-accent italic">
          &ldquo;No plan survives contact with the party.&rdquo;
        </p>
        {session && (
          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2 min-w-0">
              {isGm ? (
                <Crown className="h-4 w-4 text-accent shrink-0" />
              ) : (
                <User className="h-4 w-4 text-accent shrink-0" />
              )}
              <span className="text-xs font-medium truncate">
                {isGm ? "Game Master" : currentPlayer?.characterName || "Player"}
              </span>
            </div>
            <button
              onClick={logout}
              className="text-muted-foreground hover:text-destructive shrink-0"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
