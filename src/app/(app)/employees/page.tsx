export const dynamic = "force-dynamic";

import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { getCompanyUsers } from "@/actions/users";
import { EmployeesClient } from "@/components/employees/employees-client";

export default async function EmployeesPage() {
  const [t, session] = await Promise.all([
    getTranslations("employees"),
    getSession(),
  ]);

  const isAdmin = session?.role === "ADMIN";

  // getCompanyUsers() enforces ADMIN via requireRole — only call it for admins.
  // Non-admins get an empty list and the invite controls are hidden.
  const users = isAdmin ? await getCompanyUsers() : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 shrink-0">
          <Users className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      <EmployeesClient
        initialUsers={JSON.parse(JSON.stringify(users))}
        canManage={isAdmin}
      />
    </div>
  );
}
