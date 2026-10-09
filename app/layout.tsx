import type { Metadata } from "next";
import { Cinzel, Crimson_Pro, IM_Fell_English } from "next/font/google";
import "./globals.css";
import { MeProvider } from "@/components/me-provider";

const display = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-display",
});

const body = Crimson_Pro({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

const accent = IM_Fell_English({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic", "normal"],
  variable: "--font-accent",
});

export const metadata: Metadata = {
  title: "Codex — The GM's Companion",
  description: "A grimoire for game masters: lore, combat, dice, and notebooks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${accent.variable} font-body antialiased`}>
        <MeProvider>{children}</MeProvider>
      </body>
    </html>
  );
}
