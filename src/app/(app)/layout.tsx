import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { OfflineIndicator } from "@/components/layout/offline-indicator";
import { LivingBackground } from "@/components/layout/living-background";
import { CurrencyProvider } from "@/lib/currency-context";
import { MeasurementProvider } from "@/lib/measurement-context";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { getSystemSettings } from "@/actions/settings";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/auth-utils";
import { AIAssistantBar } from "@/components/AIAssistantBar";

async function getNotificationCount(userId: string): Promise<number> {
  try {
    return db.notification.count({ where: { userId, read: false } });
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
  const [session, settings, locale] = await Promise.all([
    getSession(),
    getSystemSettings().catch(() => ({} as Record<string, string>)),
    getLocale(),
  ]);

  // ── Hard auth gate ───────────────────────────────────────────────────────────
  // redirect() is called OUTSIDE any try/catch so the NEXT_REDIRECT signal is
  // never swallowed and always reaches the Next.js router.
  if (!session) {
    redirect("/login");
  }

  const notificationCount = await getNotificationCount(session.userId);

  const userRole = session.role as UserRole;

  const user = {
    name:     session.name,
    email:    session.email,
    initials: getInitials(session.name),
    role:     userRole,
  };

  const superAdmin        = isSuperAdminEmail(session.email);
  const companyName       = settings["company_name"] || undefined;
  const defaultCurrency   = locale === "en" ? "USD" : "ILS";
  const currencyCode      = settings["company_currency"] || settings["default_currency"] || defaultCurrency;
  const measurementSystem = settings["company_measurement_system"] || "AUTO";

  return (
  <CurrencyProvider currencyCode={currencyCode}>
  <MeasurementProvider measurementSystem={measurementSystem}>
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Animated background blobs */}
      <LivingBackground />

      {/* Sidebar — hidden on mobile, visible md+ (appears on right in RTL) */}
      <div className="hidden md:block">
        <AppSidebar user={user} companyName={companyName} isSuperAdmin={superAdmin} />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader notificationCount={notificationCount} user={user} isSuperAdmin={superAdmin} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Global offline banner — renders only when navigator.onLine === false */}
      <OfflineIndicator />
      {/* Global AI Assistant — context-aware floating bar */}
      <AIAssistantBar />
    </div>
  </MeasurementProvider>
  </CurrencyProvider>
  );
}
