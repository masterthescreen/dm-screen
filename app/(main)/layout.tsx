import { Sidebar } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen parchment-texture">
        <Sidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </AuthGuard>
  );
}
