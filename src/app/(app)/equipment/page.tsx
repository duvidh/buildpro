import { Wrench } from "lucide-react";
import { getEquipmentWithProjects, seedEquipmentData } from "@/actions/equipment";
import { getActiveProjects } from "@/actions/field";
import { EquipmentManager } from "@/components/equipment/equipment-manager";

export default async function EquipmentPage() {
  await seedEquipmentData();
  const [equipment, projects] = await Promise.all([
    getEquipmentWithProjects(),
    getActiveProjects(),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 shrink-0">
          <Wrench className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">ניהול ציוד</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            כלי עבודה, רכבים, ומכונות יקרות
          </p>
        </div>
      </div>

      <EquipmentManager initial={equipment} projects={projects} />
    </div>
  );
}
