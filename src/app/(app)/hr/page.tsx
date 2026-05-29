export const dynamic = "force-dynamic";

import { UserCog } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getEmployees, seedHRData } from "@/actions/hr";
import { HRManager } from "@/components/hr/hr-manager";

export default async function HRPage() {
  if (process.env.NODE_ENV !== "production") await seedHRData();
  const [employees, t] = await Promise.all([
    getEmployees(),
    getTranslations("hr"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
          <UserCog className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      <HRManager initial={employees} />
    </div>
  );
}
