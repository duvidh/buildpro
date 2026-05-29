"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Users, Wrench } from "lucide-react";
import { fmtDate } from "@/lib/utils";

type Member = {
  id:   string;
  role: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

type EquipmentLog = {
  id:            string;
  checkOutDate:  string;
  notes:         string | null;
  equipment:     { id: string; name: string; code: string | null; status: string };
};

export type TeamData = {
  members:       Member[];
  equipmentLogs: EquipmentLog[];
};

// className-only equipment status config
const EQUIPMENT_STATUS_CLASS: Record<string, string> = {
  AVAILABLE:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  IN_USE:      "bg-blue-100 text-blue-700 border-blue-200",
  MAINTENANCE: "bg-orange-100 text-orange-700 border-orange-200",
  RETIRED:     "bg-slate-100 text-slate-500 border-slate-200",
};

export function TeamClient({ data }: { data: TeamData }) {
  const t = useTranslations("projects");
  const { members, equipmentLogs } = data;

  const tRole = (role: string) => {
    try { return t(`memberRole.${role}` as Parameters<typeof t>[0]); }
    catch { return role; }
  };

  const tEqStatus = (status: string) => {
    try { return t(`team.equipmentStatus.${status}` as Parameters<typeof t>[0]); }
    catch { return status; }
  };

  return (
    <div className="space-y-6">
      {/* Team Members */}
      <section>
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
          <Users className="h-3.5 w-3.5" />
          {t("team.membersTitle", { count: members.length })}
        </h4>
        {members.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 px-1">
            {t("team.noMembers")}
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">
                      {t("team.col.name")}
                    </th>
                    <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">
                      {t("team.col.role")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary shrink-0">
                            {m.user.name[0]}
                          </div>
                          <span className="font-medium">{m.user.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">
                        {tRole(m.role)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Equipment */}
      <section>
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
          <Wrench className="h-3.5 w-3.5" />
          {t("team.equipmentTitle", { count: equipmentLogs.length })}
        </h4>
        {equipmentLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 px-1">
            {t("team.noEquipment")}
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">
                      {t("team.col.equipment")}
                    </th>
                    <th className="text-center font-medium text-muted-foreground px-3 py-2 text-xs">
                      {t("team.col.status")}
                    </th>
                    <th className="text-start font-medium text-muted-foreground px-3 py-2 text-xs">
                      {t("team.col.assignedFrom")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {equipmentLogs.map((log) => {
                    const cls = EQUIPMENT_STATUS_CLASS[log.equipment.status] ?? "";
                    return (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 shrink-0">
                              <Wrench className="h-3.5 w-3.5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium leading-none">{log.equipment.name}</p>
                              {log.equipment.code && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {log.equipment.code}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 ${cls}`}
                            >
                              {tEqStatus(log.equipment.status)}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">
                          {fmtDate(log.checkOutDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
