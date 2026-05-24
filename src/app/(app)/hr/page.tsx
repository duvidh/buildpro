export const dynamic = "force-dynamic";

import { UserCog } from "lucide-react";
import { getEmployees, seedHRData } from "@/actions/hr";
import { HRManager } from "@/components/hr/hr-manager";

export default async function HRPage() {
  if (process.env.NODE_ENV !== "production") await seedHRData();
  const employees = await getEmployees();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
          <UserCog className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">ניהול עובדים</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            כוח אדם, תפקידים ותוקף אישורי בטיחות
          </p>
        </div>
      </div>

      <HRManager initial={employees} />
    </div>
  );
}
