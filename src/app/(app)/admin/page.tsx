export const dynamic = "force-dynamic";

import { ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isSuperAdmin } from "@/lib/super-admin";
import { notFound } from "next/navigation";
import {
  getAllCompanies,
  getUnassignedUsers,
  getPlatformStats,
} from "@/actions/admin";
import { AdminConsole } from "@/components/admin/admin-console";

export default async function AdminPage() {
  // Hard gate: anyone who is not the platform owner gets a 404 (no hint the
  // page exists at all).
  if (!(await isSuperAdmin())) notFound();

  const [t, companies, unassigned, stats] = await Promise.all([
    getTranslations("admin"),
    getAllCompanies(),
    getUnassignedUsers(),
    getPlatformStats(),
  ]);

  // Serialize Dates for the client component.
  const data = JSON.parse(JSON.stringify({ companies, unassigned, stats }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
          <ShieldAlert className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      <AdminConsole
        companies={data.companies}
        unassigned={data.unassigned}
        stats={data.stats}
      />
    </div>
  );
}
