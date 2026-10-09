"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/auth";
import { Loader2 } from "lucide-react";

const GM_ONLY_EXACT = ["/"];
const GM_ONLY_PREFIXES = ["/lore", "/combat", "/notebooks"];

function isGmOnly(pathname: string): boolean {
  if (GM_ONLY_EXACT.includes(pathname)) return true;
  return GM_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [session, , hydrated] = useSession();
  const router = useRouter();
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (!hydrated) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.role === "player" && isGmOnly(pathname)) {
      router.replace("/player");
    }
  }, [hydrated, session, pathname, router]);

  if (!hydrated || !session || (session.role === "player" && isGmOnly(pathname))) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return <>{children}</>;
}
