import { getDashboardData } from "@/actions/dashboard";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { CustomDashboardClient } from "@/components/dashboard/CustomDashboardClient";
import type { WidgetLayoutItem } from "@/components/dashboard/widgets";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [dashboardData, session] = await Promise.all([
    getDashboardData(),
    getSession(),
  ]);

  const userName = session?.name ?? "משתמש";

  // Load user's saved dashboard layout (if any)
  let savedLayout: WidgetLayoutItem[] | null = null;
  if (session?.userId) {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { dashboardLayout: true },
    });
    if (user?.dashboardLayout) {
      savedLayout = user.dashboardLayout as WidgetLayoutItem[];
    }
  }

  return (
    <CustomDashboardClient
      dashboardData={dashboardData}
      savedLayout={savedLayout}
      userName={userName}
    />
  );
}
