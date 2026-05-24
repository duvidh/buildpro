import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

async function getNotificationCount(): Promise<number> {
  try {
    const now = new Date();
    const [overdueTasks, atRiskProjects] = await Promise.all([
      db.task.count({ where: { status: { not: "DONE" }, dueDate: { lt: now } } }),
      db.project.count({ where: { status: "ON_HOLD" } }),
    ]);
    return overdueTasks + atRiskProjects;
  } catch {
    return 0;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0);
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [notificationCount, session] = await Promise.all([
    getNotificationCount(),
    getSession(),
  ]);

  const user = session
    ? { name: session.name, email: session.email, initials: getInitials(session.name) }
    : { name: "משתמש", email: "", initials: "מ" };

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(at_left_top,_rgba(255,255,255,1),_rgba(244,244,245,0.8),_rgba(235,235,240,0.5))]">
      {/* Sidebar — hidden on mobile, visible md+ (appears on right in RTL) */}
      <div className="hidden md:flex">
        <AppSidebar user={user} />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader notificationCount={notificationCount} user={user} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
