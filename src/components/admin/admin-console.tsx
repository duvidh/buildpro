"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Building2,
  Users,
  UserCheck,
  UserMinus,
  ChevronLeft,
  Mail,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getCompanyUsersAdmin,
  setUserActiveAdmin,
} from "@/actions/admin";

// ─── Types ──────────────────────────────────────────────────────────────────

type Company = {
  id: string;
  name: string;
  createdAt: string;
  userCount: number;
  projectCount: number;
  clientCount: number;
};
type SimpleUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  authProvider: string | null;
  active: boolean;
  createdAt: string;
};
type Stats = {
  companies: number;
  users: number;
  activeUsers: number;
  unassigned: number;
};

const ROLE_BADGE_CLS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 border-red-200",
  OFFICE_MANAGER: "bg-violet-100 text-violet-700 border-violet-200",
  PROJECT_MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  FIELD_WORKER: "bg-emerald-100 text-emerald-700 border-emerald-200",
  SALES: "bg-amber-100 text-amber-700 border-amber-200",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function AdminConsole({
  companies,
  unassigned,
  stats,
}: {
  companies: Company[];
  unassigned: SimpleUser[];
  stats: Stats;
}) {
  const t = useTranslations("admin");
  const tSettings = useTranslations("settings");
  const locale = useLocale();
  const dir = locale === "he" ? "rtl" : "ltr";
  const dateLocale = locale === "he" ? "he-IL" : "en-US";

  const [, startTransition] = useTransition();

  // Drill-down dialog: users of a selected company
  const [openCompany, setOpenCompany] = useState<Company | null>(null);
  const [companyUsers, setCompanyUsers] = useState<SimpleUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const tRole = (r: string) => {
    try {
      return tSettings(`roles.${r}` as Parameters<typeof tSettings>[0]);
    } catch {
      return r;
    }
  };

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(dateLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));

  async function openCompanyUsers(c: Company) {
    setOpenCompany(c);
    setLoadingUsers(true);
    try {
      const users = await getCompanyUsersAdmin(c.id);
      setCompanyUsers(JSON.parse(JSON.stringify(users)));
    } catch {
      toast.error(t("loadError"));
      setCompanyUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  function toggleActive(u: SimpleUser, scope: "company" | "unassigned") {
    const next = !u.active;
    // optimistic
    if (scope === "company") {
      setCompanyUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, active: next } : x)),
      );
    }
    startTransition(async () => {
      const res = await setUserActiveAdmin(u.id, next);
      if (res.success) toast.success(t("saved"));
      else toast.error(t("saveError"));
    });
  }

  const statCards = [
    { icon: Building2, label: t("stats.companies"), value: stats.companies },
    { icon: Users, label: t("stats.users"), value: stats.users },
    { icon: UserCheck, label: t("stats.activeUsers"), value: stats.activeUsers },
    { icon: UserMinus, label: t("stats.unassigned"), value: stats.unassigned },
  ];

  return (
    <div className="space-y-6" dir={dir}>
      {/* ── Platform stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-4 flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="text-2xl font-bold leading-none">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Companies ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">{t("companiesTitle")}</h3>
        {companies.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("noCompanies")}
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs">
                      {t("colCompany")}
                    </th>
                    <th className="text-center font-medium text-muted-foreground px-4 py-3 text-xs">
                      {t("colUsers")}
                    </th>
                    <th className="text-center font-medium text-muted-foreground px-4 py-3 text-xs hidden sm:table-cell">
                      {t("colProjects")}
                    </th>
                    <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs hidden md:table-cell">
                      {t("colCreated")}
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {companies.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Building2 className="h-4 w-4" />
                          </span>
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary" className="text-xs">
                          {c.userCount}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground hidden sm:table-cell">
                        {c.projectCount}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        {fmtDate(c.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openCompanyUsers(c)}
                        >
                          {t("viewUsers")}
                          <ChevronLeft className="h-3.5 w-3.5 ms-1 rtl:rotate-180" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Unassigned users (signed up, no company yet) ── */}
      {unassigned.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <UserMinus className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{t("unassignedTitle")}</h3>
            <Badge variant="outline" className="text-[10px]">
              {unassigned.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{t("unassignedHint")}</p>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs">
                      {t("colUser")}
                    </th>
                    <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs hidden sm:table-cell">
                      {t("colCreated")}
                    </th>
                    <th className="text-center font-medium text-muted-foreground px-4 py-3 text-xs">
                      {t("colActive")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {unassigned.map((u) => (
                    <UserRow
                      key={u.id}
                      u={u}
                      tRole={tRole}
                      fmtDate={fmtDate}
                      onToggle={() => toggleActive(u, "unassigned")}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Company users drill-down ── */}
      <Dialog open={!!openCompany} onOpenChange={(v) => !v && setOpenCompany(null)}>
        <DialogContent dir={dir} className="sm:max-w-2xl">
          <DialogHeader className="text-start">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              {openCompany?.name}
            </DialogTitle>
          </DialogHeader>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : companyUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("noUsers")}
            </p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden mt-2">
              <div className="overflow-x-auto max-h-[55vh]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="text-start font-medium text-muted-foreground px-4 py-2.5 text-xs">
                        {t("colUser")}
                      </th>
                      <th className="text-center font-medium text-muted-foreground px-4 py-2.5 text-xs">
                        {t("colActive")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {companyUsers.map((u) => (
                      <UserRow
                        key={u.id}
                        u={u}
                        tRole={tRole}
                        fmtDate={fmtDate}
                        onToggle={() => toggleActive(u, "company")}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  // ── Row sub-component ──
  function UserRow({
    u,
    tRole,
    fmtDate,
    onToggle,
  }: {
    u: SimpleUser;
    tRole: (r: string) => string;
    fmtDate: (iso: string) => string;
    onToggle: () => void;
  }) {
    return (
      <tr className={`hover:bg-muted/20 transition-colors ${!u.active ? "opacity-50" : ""}`}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {u.name[0]?.toUpperCase() ?? "?"}
            </span>
            <div className="min-w-0">
              <p className="font-medium leading-none truncate">{u.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                <span dir="ltr" className="truncate">{u.email}</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${ROLE_BADGE_CLS[u.role] ?? ""}`}
                >
                  {tRole(u.role)}
                </Badge>
                {u.authProvider === "google" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Google
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-center">
            <Switch checked={u.active} onCheckedChange={onToggle} />
          </div>
        </td>
      </tr>
    );
  }
}
