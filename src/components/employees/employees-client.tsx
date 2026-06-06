"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { UserPlus, Loader2, UserX } from "lucide-react";
import { toast } from "sonner";
import { inviteEmployee, setEmployeeRole, removeEmployee } from "@/actions/users";
import { UserRole } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmployeeUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
  active: boolean;
  authProvider?: string | null;
  companyId?: string | null;
  createdAt?: string | Date;
};

const ROLE_VALUES: UserRole[] = [
  "ADMIN", "OFFICE_MANAGER", "PROJECT_MANAGER", "FIELD_WORKER", "SALES",
];

const ROLE_BADGE_CLS: Record<UserRole, string> = {
  ADMIN:           "bg-purple-100 text-purple-700 border-purple-200",
  OFFICE_MANAGER:  "bg-blue-100 text-blue-700 border-blue-200",
  PROJECT_MANAGER: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FIELD_WORKER:    "bg-amber-100 text-amber-700 border-amber-200",
  SALES:           "bg-orange-100 text-orange-700 border-orange-200",
};

// ─── Component ──────────────────────────────────────────────────────────────────

export function EmployeesClient({
  initialUsers,
  canManage,
}: {
  initialUsers: EmployeeUser[];
  canManage: boolean;
}) {
  const t = useTranslations("employees");
  const tSettings = useTranslations("settings");
  const locale = useLocale();
  const dir = locale === "he" ? "rtl" : "ltr";
  const tRole = (r: UserRole) =>
    tSettings(`roles.${r}` as Parameters<typeof tSettings>[0]);

  const [users, setUsers] = useState<EmployeeUser[]>(initialUsers);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "FIELD_WORKER" as UserRole,
  });

  function resetForm() {
    setForm({ name: "", email: "", role: "FIELD_WORKER" });
  }

  async function handleInvite() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error(t("errorGeneric"));
      return;
    }
    setSubmitting(true);
    const res = await inviteEmployee(form);
    setSubmitting(false);
    if (res.success) {
      setUsers((prev) => [res.user as EmployeeUser, ...prev]);
      toast.success(t("inviteSuccess"));
      setOpen(false);
      resetForm();
      return;
    }
    const msg =
      res.error === "user_exists"
        ? t("errorExists")
        : res.error === "invalid_email"
        ? t("errorEmail")
        : res.error === "no_company"
        ? t("errorNoCompany")
        : t("errorGeneric");
    toast.error(msg);
  }

  async function handleRoleChange(id: string, role: UserRole) {
    const prev = users;
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, role } : x)));
    const res = await setEmployeeRole(id, role);
    if (!res.success) {
      setUsers(prev);
      toast.error(t("errorGeneric"));
    } else {
      toast.success(t("roleChangeSuccess"));
    }
  }

  async function handleDeactivate(id: string) {
    const prev = users;
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, active: false } : x)));
    const res = await removeEmployee(id);
    if (!res.success) {
      setUsers(prev);
      toast.error(res.error === "self" ? t("deactivateSelfError") : t("errorGeneric"));
    } else {
      toast.success(t("deactivateSuccess"));
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {canManage && (
        <div className="flex items-center justify-end">
          <Button onClick={() => { resetForm(); setOpen(true); }}>
            <UserPlus className="h-4 w-4 me-2" />
            {t("inviteBtn")}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {users.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("colUser")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("colEmail")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("colRole")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("colStatus")}</th>
                {canManage && (
                  <th className="px-4 py-3 text-end font-medium">{t("colActions")}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className={cn(!u.active && "opacity-50")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {u.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground" dir="ltr">{u.email}</td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <Select
                        value={u.role}
                        onValueChange={(v) => handleRoleChange(u.id, v as UserRole)}
                      >
                        <SelectTrigger className="h-8 w-auto min-w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_VALUES.map((r) => (
                            <SelectItem key={r} value={r}>{tRole(r)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={ROLE_BADGE_CLS[u.role]}>
                        {tRole(u.role)}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                          u.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            u.active ? "bg-emerald-500" : "bg-slate-400"
                          )}
                        />
                        {u.active ? t("statusActive") : t("statusInactive")}
                      </span>
                      {u.authProvider === "google" ? (
                        <Badge
                          variant="outline"
                          className="bg-sky-50 text-sky-700 border-sky-200"
                        >
                          {t("googleLinked")}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("pending")}
                        </span>
                      )}
                    </div>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {u.active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeactivate(u.id)}
                          >
                            <UserX className="h-4 w-4 me-1.5" />
                            {t("deactivate")}
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite dialog */}
      {canManage && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir={dir}>
            <DialogHeader>
              <DialogTitle>{t("inviteDialogTitle")}</DialogTitle>
              <DialogDescription>{t("inviteDialogSubtitle")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-name">{t("nameLabel")}</Label>
                <Input
                  id="invite-name"
                  value={form.name}
                  placeholder={t("namePlaceholder")}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">{t("emailLabel")}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  dir="ltr"
                  value={form.email}
                  placeholder={t("emailPlaceholder")}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("roleLabel")}</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v as UserRole }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_VALUES.map((r) => (
                      <SelectItem key={r} value={r}>{tRole(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={handleInvite} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {submitting ? t("submitting") : t("submit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
