"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Swords, Dices, FileText } from "lucide-react";

const tiles = [
  {
    href: "/lore",
    title: "Lore Codex",
    desc: "Chart your world — continents, kingdoms, cities, shops, and the people who inhabit them.",
    icon: BookOpen,
  },
  {
    href: "/combat",
    title: "Combat Table",
    desc: "Build encounters, catalog monsters, and track initiative when steel meets steel.",
    icon: Swords,
  },
  {
    href: "/dice",
    title: "Dice Tower",
    desc: "Roll GM dice for any occasion, or let fate decide with random encounter tables.",
    icon: Dices,
  },
  {
    href: "/notebooks",
    title: "Notebooks",
    desc: "Keep your secret GM notes, and pass word to your players' own notebooks.",
    icon: FileText,
  },
];

export default function HomePage() {
  return (
    <div className="p-10 max-w-6xl mx-auto">
      <div className="mb-10 border-b border-border/60 pb-6">
        <p className="font-accent text-primary text-lg italic mb-1 font-semibold">Welcome back, Keeper of Tales</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">The Hearth</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Your campaign toolkit — lore, combat, dice, and the written word — all gathered by the fire.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href}>
            <Card className="h-full transition-all hover:border-accent hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div className="rounded-md bg-primary/10 p-2.5 group-hover:bg-accent/20 transition-colors">
                  <tile.icon className="h-6 w-6 text-primary group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <CardTitle className="font-display text-xl">{tile.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{tile.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
