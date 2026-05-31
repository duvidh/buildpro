import { getDashboardData } from "@/actions/dashboard";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { CustomDashboardClient } from "@/components/dashboard/CustomDashboardClient";
import type { WidgetLayoutItem } from "@/components/dashboard/widgets";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [dashboardData, session, locale] = await Promise.all([
    getDashboardData(),
    getSession(),
    getLocale(),
  ]);

  const userName = session?.name ?? "User";

  // Load user's saved dashboard layout (if any)
  let savedLayout: WidgetLayoutItem[] | null = null;
  if (session?.userId) {
    try {
      const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { dashboardLayout: true },
      });
      if (user?.dashboardLayout) {
        savedLayout = user.dashboardLayout as WidgetLayoutItem[];
      }
    } catch {
      // Non-fatal: fall back to the default layout
    }
  }

  return (
    <CustomDashboardClient
      dashboardData={dashboardData}
      savedLayout={savedLayout}
      userName={userName}
      locale={locale}
    />
  );
}
