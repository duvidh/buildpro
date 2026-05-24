export const dynamic = "force-dynamic";

import { Building2 } from "lucide-react";
import { getSubcontractors } from "@/actions/subcontractors";
import { SubcontractorsManager } from "@/components/subcontractors/subcontractors-manager";

export default async function SubcontractorsPage() {
  const suppliers = await getSubcontractors();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 shrink-0">
          <Building2 className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">ספקים וקבלני משנה</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ניהול ספקים, קבלני משנה ודירוגיהם
          </p>
        </div>
      </div>

      <SubcontractorsManager initial={suppliers} />
    </div>
  );
}
