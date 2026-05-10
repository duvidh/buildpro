import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(at_left_top,_rgba(255,255,255,1),_rgba(244,244,245,0.8),_rgba(235,235,240,0.5))]">
      {/* Sidebar — hidden on mobile, visible md+ (appears on right in RTL) */}
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
