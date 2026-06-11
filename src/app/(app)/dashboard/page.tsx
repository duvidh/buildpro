import { getDashboardData, getDashboardStats } from "@/actions/dashboard";
import { getSetupProgress } from "@/actions/onboarding";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { CustomDashboardClient } from "@/components/dashboard/CustomDashboardClient";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import type { WidgetLayoutItem } from "@/components/dashboard/widgets";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [dashboardData, execStats, session, locale, setupProgress] =
    await Promise.all([
      getDashboardData(),
      getDashboardStats(),
      getSession(),
      getLocale(),
      getSetupProgress(),
    ]);

  const userName = session?.name ?? "User";

  // Progressive disclosure: only companies with NO data at all see the setup
  // checklist — anyone with activity lands on the executive command center.
  if (setupProgress?.showChecklist && setupProgress.completedCount === 0) {
    return <SetupChecklist progress={setupProgress} userName={userName} />;
  }

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
      dashboardData={{ ...dashboardData, execStats }}
      savedLayout={savedLayout}
      userName={userName}
      locale={locale}
    />
  );
}
