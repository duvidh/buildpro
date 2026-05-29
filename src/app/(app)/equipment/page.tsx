export const dynamic = "force-dynamic";

import { Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getEquipmentWithProjects, seedEquipmentData } from "@/actions/equipment";
import { getActiveProjects } from "@/actions/field";
import { EquipmentManager } from "@/components/equipment/equipment-manager";

export default async function EquipmentPage() {
  if (process.env.NODE_ENV !== "production") await seedEquipmentData();
  const [equipment, projects, t] = await Promise.all([
    getEquipmentWithProjects(),
    getActiveProjects(),
    getTranslations("equipment"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 shrink-0">
          <Wrench className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      <EquipmentManager initial={equipment} projects={projects} />
    </div>
  );
}
