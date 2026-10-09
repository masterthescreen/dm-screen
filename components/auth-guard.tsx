"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMe } from "@/components/me-provider";
import { Loader2 } from "lucide-react";

const GM_ONLY_EXACT = ["/"];
const GM_ONLY_PREFIXES = ["/lore", "/players", "/combat", "/notebooks"];

function isGmOnly(pathname: string): boolean {
  if (GM_ONLY_EXACT.includes(pathname)) return true;
  return GM_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
}

// Presentation only: this keeps people from seeing pages that wouldn't work for
// them. The real protection is server-side: every API route checks the caller.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { me, loaded } = useMe();
  const router = useRouter();
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (!loaded) return;
    if (!me) {
      router.replace("/login");
      return;
    }
    if (me.role === "player" && isGmOnly(pathname)) router.replace("/player");
  }, [loaded, me, pathname, router]);

  if (!loaded || !me || (me.role === "player" && isGmOnly(pathname))) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return <>{children}</>;
}
