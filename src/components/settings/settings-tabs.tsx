"use client";

import { useState, useTransition, useEffect } from "react";
import { useTheme } from "next-themes";
import { useTranslations, useLocale } from "next-intl";
import {
  Building2,
  BellRing,
  Users,
  ShieldCheck,
  Save,
  CheckCircle,
  Palette,
  Check,
  BadgePercent,
  FileText,
  UserPlus,
  Clock,
  X,
  RefreshCw,
  Loader2,
  Mail,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { saveAllSettings } from "@/actions/settings";
import { updateUserRole, toggleUserActive } from "@/actions/users";
import { inviteUser, cancelInvitation, resendInvitation } from "@/actions/invitations";
import { SUPPORTED_CURRENCIES } from "@/lib/formatters";
import { useCurrency } from "@/lib/currency-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  active: boolean;
  createdAt: Date;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  // Dates arrive as ISO strings after JSON.parse(JSON.stringify(...)) in the page
  expiresAt: Date | string;
  createdAt: Date | string;
  invitedBy: { name: string } | null;
};

// ─── Role badge class map (className only — labels from translations) ─────────

const ROLE_BADGE_CLS: Record<string, string> = {
  ADMIN:           "bg-red-100 text-red-700 border-red-200",
  OFFICE_MANAGER:  "bg-violet-100 text-violet-700 border-violet-200",
  PROJECT_MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  FIELD_WORKER:    "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const ROLE_VALUES = ["ADMIN", "OFFICE_MANAGER", "PROJECT_MANAGER", "FIELD_WORKER"] as const;

const COMPANY_FIELD_KEYS = [
  { key: "company_name"    as const, type: "text"  as const },
  { key: "company_phone"   as const, type: "text"  as const },
  { key: "company_email"   as const, type: "email" as const },
  { key: "company_address" as const, type: "text"  as const },
  { key: "company_vat"     as const, type: "text"  as const },
];

const TOGGLE_KEYS = [
  "notif_tasks",
  "notif_invoices",
  "notif_leads",
  "notif_daily",
  "notif_safety",
  "compact_view",
] as const;

type ToggleKey = typeof TOGGLE_KEYS[number];

// Currency values are driven by SUPPORTED_CURRENCIES from @/lib/formatters

// ─── Theme definitions (no label — computed from translations) ─────────────────

type ThemeDef = {
  value: string;
  primary: string;
  bg: string;
  sidebar: string;
  isDark?: boolean;
};

const THEMES: ThemeDef[] = [
  { value: "light",        primary: "#6366f1", bg: "#f8f8f8",  sidebar: "#1e1f3b" },
  { value: "dark",         primary: "#818cf8", bg: "#252525",  sidebar: "#111118", isDark: true },
  { value: "teal",         primary: "#2dd4bf", bg: "#0d1a1a",  sidebar: "#061010", isDark: true },
  { value: "theme-slate",  primary: "#64748b", bg: "#f5f7f9",  sidebar: "#1a2030" },
  { value: "theme-indigo", primary: "#6366f1", bg: "#f2f2fe",  sidebar: "#1a1a40" },
  { value: "theme-blue",   primary: "#3b82f6", bg: "#eff6ff",  sidebar: "#0f1f40" },
  { value: "theme-green",  primary: "#22c55e", bg: "#f0fdf4",  sidebar: "#0c2010" },
  { value: "theme-purple", primary: "#a855f7", bg: "#faf5ff",  sidebar: "#1a0c30" },
  { value: "theme-rose",   primary: "#f43f5e", bg: "#fff1f2",  sidebar: "#2a0818" },
  { value: "theme-orange", primary: "#f97316", bg: "#fff7ed",  sidebar: "#2a1008" },
  { value: "theme-amber",  primary: "#f59e0b", bg: "#fffbeb",  sidebar: "#2a1a00" },
];

// ─── Company Tab ──────────────────────────────────────────────────────────────

function CompanyTab({ initial }: { initial: Record<string, string> }) {
  const t      = useTranslations("settings");
  const locale = useLocale();
  const { currencyCode } = useCurrency();

  const [form, setForm] = useState({
    company_name:    initial.company_name    ?? t("company.placeholders.company_name"),
    company_phone:   initial.company_phone   ?? "",
    company_email:   initial.company_email   ?? "",
    company_address: initial.company_address ?? "",
    company_vat:     initial.company_vat     ?? "",
  });
  const [saved, setSaved]           = useState(false);
  const [, startTransition]         = useTransition();

  function handleSave() {
    startTransition(async () => {
      await saveAllSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  // ── Dynamic System Info values ────────────────────────────────────────────
  const activeCurrency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  const currencyValueStr = activeCurrency
    ? `${locale === "he" ? activeCurrency.nameHe : activeCurrency.nameEn} (${activeCurrency.symbol} ${activeCurrency.code})`
    : currencyCode;
  const langValueStr = locale === "en"
    ? t("company.systemInfo.langValueEn" as Parameters<typeof t>[0])
    : t("company.systemInfo.langValue"   as Parameters<typeof t>[0]);

  const systemInfoRows = [
    { label: t("company.systemInfo.version"),  value: t("company.systemInfo.versionValue") },
    { label: t("company.systemInfo.db"),       value: t("company.systemInfo.dbValue")      },
    { label: t("company.systemInfo.currency"), value: currencyValueStr                     },
    { label: t("company.systemInfo.lang"),     value: langValueStr                         },
  ];

  return (
    <div className="space-y-5">
      {/* Company details */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">{t("company.title")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("company.subtitle")}</p>
        </div>
        <Separator />
        <div className="space-y-3">
          {COMPANY_FIELD_KEYS.map(({ key, type }) => (
            <div key={key} className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-4">
              <Label className="text-sm text-muted-foreground sm:text-end">
                {t(`company.fields.${key}` as Parameters<typeof t>[0])}
              </Label>
              <Input
                className="sm:col-span-2"
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={t(`company.placeholders.${key}` as Parameters<typeof t>[0])}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end items-center gap-3 pt-1">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              {t("company.saved")}
            </span>
          )}
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 me-1.5" />
            {t("company.save")}
          </Button>
        </div>
      </div>

      {/* Logo */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">{t("company.logo.title")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("company.logo.subtitle")}</p>
        </div>
        <Separator />
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground text-xs text-center p-1">
            {t("company.logo.placeholder")}
          </div>
          <div className="space-y-1.5">
            <Button variant="outline" size="sm" className="text-xs">
              {t("company.logo.upload")}
            </Button>
            <p className="text-[11px] text-muted-foreground">{t("company.logo.hint")}</p>
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">{t("company.systemInfo.title")}</h3>
        <Separator />
        {systemInfoRows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4 py-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Preferences Tab ──────────────────────────────────────────────────────────

function PreferencesTab() {
  const t = useTranslations("settings");

  const [prefs, setPrefs] = useState<Record<ToggleKey, boolean>>({
    notif_tasks:    true,
    notif_invoices: true,
    notif_leads:    false,
    notif_daily:    true,
    notif_safety:   true,
    compact_view:   false,
  });
  const [saved, setSaved] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{t("preferences.title")}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t("preferences.subtitle")}</p>
      </div>
      <Separator />
      <div className="divide-y divide-border">
        {TOGGLE_KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between py-3 px-1">
            <div>
              <p className="text-sm font-medium">
                {t(`preferences.toggles.${key}.label` as Parameters<typeof t>[0])}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(`preferences.toggles.${key}.description` as Parameters<typeof t>[0])}
              </p>
            </div>
            <Switch
              checked={prefs[key]}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end items-center gap-3 pt-1">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            {t("preferences.saved")}
          </span>
        )}
        <Button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}>
          <Save className="h-4 w-4 me-1.5" />
          {t("preferences.save")}
        </Button>
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({
  initialUsers,
  initialInvitations,
  canInvite,
}: {
  initialUsers: User[];
  initialInvitations: Invitation[];
  canInvite: boolean;
}) {
  const t = useTranslations("settings");
  const [users, setUsers]               = useState(initialUsers);
  const [invitations, setInvitations]   = useState(initialInvitations);
  const [, startTransition]             = useTransition();

  // ── Invite dialog state ───────────────────────────────────────────────────
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [inviteEmail,  setInviteEmail]  = useState("");
  const [inviteRole,   setInviteRole]   = useState<typeof ROLE_VALUES[number]>("FIELD_WORKER");
  const [inviting,     setInviting]     = useState(false);
  const [inviteMsg,    setInviteMsg]    = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const tRole = (r: string) => {
    try { return t(`roles.${r}` as Parameters<typeof t>[0]); } catch { return r; }
  };

  function handleRoleChange(id: string, role: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    startTransition(async () => {
      await updateUserRole(id, role as Parameters<typeof updateUserRole>[1]);
    });
  }

  function handleToggleActive(id: string, active: boolean) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active } : u)));
    startTransition(async () => {
      await toggleUserActive(id, active);
    });
  }

  // ── Invite submit ──────────────────────────────────────────────────────────
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    const res = await inviteUser(inviteEmail, inviteRole as Parameters<typeof inviteUser>[1]);
    setInviting(false);
    if ("error" in res) {
      setInviteMsg({
        type: "err",
        text: res.error === "user_exists"
          ? t("users.inviteErrorExists" as Parameters<typeof t>[0])
          : t("users.inviteErrorGeneric" as Parameters<typeof t>[0]),
      });
    } else {
      setInviteMsg({ type: "ok", text: t("users.inviteSuccess" as Parameters<typeof t>[0]) });
      setInviteEmail("");
      setInviteRole("FIELD_WORKER");
      // Add with real DB id so cancel/resend work immediately without a refresh
      setInvitations((prev) => [
        {
          id:        res.invitation.id,
          email:     res.invitation.email,
          role:      res.invitation.role,
          expiresAt: res.invitation.expiresAt,
          createdAt: res.invitation.createdAt,
          invitedBy: null,
        },
        ...prev,
      ]);
      setTimeout(() => { setDialogOpen(false); setInviteMsg(null); }, 1500);
    }
  }

  // ── Cancel invitation ──────────────────────────────────────────────────────
  function handleCancel(id: string) {
    setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    startTransition(async () => { await cancelInvitation(id); });
  }

  // ── Resend invitation ─────────────────────────────────────────────────────
  function handleResend(id: string) {
    startTransition(async () => { await resendInvitation(id); });
  }

  const now = new Date();

  return (
    <div className="space-y-4">
      {/* ── Active users ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold">{t("users.title")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t("users.subtitle")}</p>
          </div>
          {canInvite && (
            <Button size="sm" onClick={() => { setDialogOpen(true); setInviteMsg(null); }}>
              <UserPlus className="h-4 w-4 me-1.5" />
              {t("users.inviteBtn" as Parameters<typeof t>[0])}
            </Button>
          )}
        </div>
        <Separator />
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs">{t("users.colUser")}</th>
                  <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs hidden sm:table-cell">{t("users.colEmail")}</th>
                  <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs">{t("users.colRole")}</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3 text-xs">{t("users.colActive")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className={`hover:bg-muted/20 transition-colors ${!u.active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {u.name[0]}
                        </div>
                        <div>
                          <p className="font-medium leading-none">{u.name}</p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] mt-0.5 px-1.5 py-0 ${ROLE_BADGE_CLS[u.role] ?? ""}`}
                          >
                            <ShieldCheck className="h-2.5 w-2.5 me-0.5" />
                            {tRole(u.role)}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v)}>
                        <SelectTrigger className="h-7 w-[160px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_VALUES.map((rv) => (
                            <SelectItem key={rv} value={rv} className="text-xs">
                              {tRole(rv)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <Switch
                          checked={u.active}
                          onCheckedChange={(v) => handleToggleActive(u.id, v)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
          <strong>{t("noteLabel")}:</strong>{" "}{t("users.note")}
        </div>
      </div>

      {/* ── Pending invitations ──────────────────────────────────────────── */}
      {canInvite && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{t("users.pendingTitle" as Parameters<typeof t>[0])}</h3>
            {invitations.length > 0 && (
              <Badge variant="outline" className="text-[10px] ms-1">{invitations.length}</Badge>
            )}
          </div>
          <Separator />
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("users.noPending" as Parameters<typeof t>[0])}
            </p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs">
                        {t("users.pendingColEmail" as Parameters<typeof t>[0])}
                      </th>
                      <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs hidden sm:table-cell">
                        {t("users.pendingColRole" as Parameters<typeof t>[0])}
                      </th>
                      <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs hidden md:table-cell">
                        {t("users.pendingColExpires" as Parameters<typeof t>[0])}
                      </th>
                      <th className="text-center font-medium text-muted-foreground px-4 py-3 text-xs">
                        {t("users.pendingColStatus" as Parameters<typeof t>[0])}
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invitations.map((inv) => {
                      const expiresDate = new Date(inv.expiresAt);
                      const expired = expiresDate < now;
                      return (
                        <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-sm">{inv.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${ROLE_BADGE_CLS[inv.role] ?? ""}`}
                            >
                              {tRole(inv.role)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                            {expiresDate.toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant="outline"
                              className={expired
                                ? "text-[10px] bg-red-50 text-red-600 border-red-200"
                                : "text-[10px] bg-amber-50 text-amber-600 border-amber-200"}
                            >
                              {expired
                                ? t("users.statusExpired" as Parameters<typeof t>[0])
                                : t("users.statusPending" as Parameters<typeof t>[0])}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {!expired && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => handleResend(inv.id)}
                                >
                                  <RefreshCw className="h-3 w-3 me-1" />
                                  {t("users.actionResend" as Parameters<typeof t>[0])}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                onClick={() => handleCancel(inv.id)}
                              >
                                <X className="h-3 w-3 me-1" />
                                {t("users.actionCancel" as Parameters<typeof t>[0])}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Invite dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("users.inviteDialogTitle" as Parameters<typeof t>[0])}</DialogTitle>
            <DialogDescription>{t("users.inviteDialogSubtitle" as Parameters<typeof t>[0])}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">
                {t("users.inviteEmailLabel" as Parameters<typeof t>[0])}
              </Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t("users.inviteEmailPlaceholder" as Parameters<typeof t>[0])}
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("users.inviteRoleLabel" as Parameters<typeof t>[0])}</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_VALUES.map((rv) => (
                    <SelectItem key={rv} value={rv}>
                      {tRole(rv)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {inviteMsg && (
              <p className={`rounded-lg px-3 py-2 text-sm border ${
                inviteMsg.type === "ok"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-red-50 border-red-200 text-red-600"
              }`}>
                {inviteMsg.text}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("users.actionCancel" as Parameters<typeof t>[0])}
              </Button>
              <Button type="submit" disabled={inviting}>
                {inviting ? (
                  <><Loader2 className="h-4 w-4 me-1.5 animate-spin" />{t("users.inviteSending" as Parameters<typeof t>[0])}</>
                ) : (
                  <><UserPlus className="h-4 w-4 me-1.5" />{t("users.inviteSend" as Parameters<typeof t>[0])}</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Financials Tab ───────────────────────────────────────────────────────────

function FinancialsTab({ initial }: { initial: Record<string, string> }) {
  const t = useTranslations("settings");

  const [vatRate,     setVatRate]     = useState(initial.vat_rate ?? "17");
  const [currency,   setCurrency]    = useState(
    initial.company_currency || initial.default_currency || "ILS"
  );
  const [measurement, setMeasurement] = useState(
    initial.company_measurement_system || "AUTO"
  );
  const [saved,    setSaved]    = useState(false);
  const [, startTransition]     = useTransition();

  function handleSave() {
    startTransition(async () => {
      await saveAllSettings({
        vat_rate: vatRate,
        company_currency: currency,
        company_measurement_system: measurement,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">{t("financials.title")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("financials.subtitle")}</p>
        </div>
        <Separator />

        {/* VAT rate */}
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-4">
          <Label className="text-sm text-muted-foreground sm:text-end">{t("financials.vatLabel")}</Label>
          <div className="sm:col-span-2 flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              className="w-28"
              dir="ltr"
            />
            <span className="text-sm text-muted-foreground">%</span>
            <span className="text-xs text-muted-foreground">{t("financials.vatDefault")}</span>
          </div>
        </div>

        {/* System Currency — 10 options */}
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-4">
          <Label className="text-sm text-muted-foreground sm:text-end">{t("financials.currencyLabel")}</Label>
          <div className="sm:col-span-2">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol}&nbsp;&nbsp;{c.code} — {c.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Measurement System */}
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:items-center sm:gap-4">
          <Label className="text-sm text-muted-foreground sm:text-end">{t("financials.measurementLabel")}</Label>
          <div className="sm:col-span-2">
            <Select value={measurement} onValueChange={setMeasurement}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["AUTO", "METRIC", "IMPERIAL"] as const).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {t(`financials.measurementOptions.${opt}` as Parameters<typeof t>[0])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end items-center gap-3 pt-1">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              {t("financials.saved")}
            </span>
          )}
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 me-1.5" />
            {t("financials.save")}
          </Button>
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
        <strong>{t("noteLabel")}:</strong>{" "}{t("financials.note")}
      </div>
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ initial }: { initial: Record<string, string> }) {
  const t = useTranslations("settings");

  const [quoteFooter,   setQuoteFooter]   = useState(initial.quote_footer   ?? "");
  const [invoiceFooter, setInvoiceFooter] = useState(initial.invoice_footer ?? "");
  const [saved,         setSaved]         = useState(false);
  const [, startTransition]               = useTransition();

  function handleSave() {
    startTransition(async () => {
      await saveAllSettings({ quote_footer: quoteFooter, invoice_footer: invoiceFooter });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold">{t("documents.title")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("documents.subtitle")}</p>
        </div>
        <Separator />

        {/* Quote footer */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("documents.quoteFooterLabel")}</Label>
          <p className="text-xs text-muted-foreground">{t("documents.quoteFooterHint")}</p>
          <Textarea
            value={quoteFooter}
            onChange={(e) => setQuoteFooter(e.target.value)}
            placeholder={t("documents.quoteFooterPlaceholder")}
            rows={5}
            className="text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground text-end">
            {t("documents.charCount", { count: quoteFooter.length })}
          </p>
        </div>

        <Separator />

        {/* Invoice footer */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("documents.invoiceFooterLabel")}</Label>
          <p className="text-xs text-muted-foreground">{t("documents.invoiceFooterHint")}</p>
          <Textarea
            value={invoiceFooter}
            onChange={(e) => setInvoiceFooter(e.target.value)}
            placeholder={t("documents.invoiceFooterPlaceholder")}
            rows={5}
            className="text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground text-end">
            {t("documents.charCount", { count: invoiceFooter.length })}
          </p>
        </div>

        <div className="flex justify-end items-center gap-3 pt-1">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              {t("documents.saved")}
            </span>
          )}
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 me-1.5" />
            {t("documents.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Appearance Tab ───────────────────────────────────────────────────────────

function ThemePreview({
  themeData,
  label,
  isActive,
}: {
  themeData: ThemeDef;
  label: string;
  isActive: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => undefined}
      className={[
        "relative flex flex-col gap-2 rounded-xl border-2 p-2.5 text-start transition-all duration-150",
        isActive
          ? "border-primary ring-2 ring-primary/25 shadow-md"
          : "border-border hover:border-primary/40 hover:shadow-sm",
      ].join(" ")}
    >
      {/* Mini UI preview */}
      <div
        className="w-full h-12 rounded-lg overflow-hidden relative shrink-0"
        style={{ background: themeData.bg }}
      >
        <div className="absolute inset-y-0 end-0 w-5" style={{ background: themeData.sidebar }} />
        <div className="absolute top-2 start-2 space-y-1.5">
          <div className="h-1.5 w-10 rounded-full opacity-70" style={{ background: themeData.primary }} />
          <div className="h-1 w-14 rounded-full opacity-30" style={{ background: themeData.isDark ? "#fff" : "#000" }} />
          <div className="h-1 w-10 rounded-full opacity-20" style={{ background: themeData.isDark ? "#fff" : "#000" }} />
        </div>
        <div className="absolute bottom-2 end-7 h-3 w-3 rounded-full shadow-sm" style={{ background: themeData.primary }} />
      </div>

      {/* Label row */}
      <div className="flex items-center gap-1.5 px-0.5">
        <div className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm" style={{ background: themeData.primary }} />
        <span className="text-[11px] font-medium text-foreground leading-none truncate">{label}</span>
      </div>

      {isActive && (
        <div className="absolute top-1.5 start-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center shadow-sm">
          <Check className="h-2.5 w-2.5 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

function AppearanceTab() {
  const t                        = useTranslations("settings");
  const { theme, setTheme }      = useTheme();
  const [mounted, setMounted]    = useState(false);
  const [noAnimations, setNoAnimations] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try {
      setNoAnimations(localStorage.getItem("buildpro-no-animations") === "1");
    } catch {
      setNoAnimations(false);
    }
  }, []);

  function toggleAnimations(val: boolean) {
    setNoAnimations(val);
    try {
      if (val) localStorage.setItem("buildpro-no-animations", "1");
      else     localStorage.removeItem("buildpro-no-animations");
    } catch { /* ignore */ }
    window.dispatchEvent(new StorageEvent("storage", { key: "buildpro-no-animations" }));
  }

  const themeLabel = (value: string) => {
    const key = value.replace(/^theme-/, "");
    try { return t(`appearance.themes.${key}` as Parameters<typeof t>[0]); } catch { return key; }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-5">
      {/* Theme selector */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">{t("appearance.title")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("appearance.subtitle")}</p>
        </div>
        <Separator />
        <div
          className="grid gap-2.5"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))" }}
        >
          {THEMES.map((td) => (
            <div key={td.value} onClick={() => setTheme(td.value)}>
              <ThemePreview themeData={td} label={themeLabel(td.value)} isActive={theme === td.value} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center pt-1">
          {t("appearance.activeTheme")}{" "}
          <strong className="text-foreground">
            {THEMES.find((td) => td.value === theme) ? themeLabel(theme ?? "") : theme}
          </strong>
        </p>
      </div>

      {/* Animation toggle */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">{t("appearance.animations.title")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("appearance.animations.subtitle")}</p>
        </div>
        <Separator />
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium">{t("appearance.animations.label")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("appearance.animations.description")}</p>
          </div>
          <Switch checked={noAnimations} onCheckedChange={toggleAnimations} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TAB_ICONS = {
  company:     Building2,
  financials:  BadgePercent,
  documents:   FileText,
  preferences: BellRing,
  users:       Users,
  appearance:  Palette,
} as const;

type TabValue = keyof typeof TAB_ICONS;

const TAB_VALUES: TabValue[] = ["company", "financials", "documents", "preferences", "users", "appearance"];

export function SettingsTabs({
  systemSettings,
  users,
  invitations,
  canInvite,
}: {
  systemSettings: Record<string, string>;
  users: User[];
  invitations: Invitation[];
  canInvite: boolean;
}) {
  const t      = useTranslations("settings");
  const locale = useLocale();

  return (
    <Tabs defaultValue="company" dir={locale === "he" ? "rtl" : "ltr"}>
      <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto gap-0 overflow-x-auto scrollbar-none">
        {TAB_VALUES.map((value) => {
          const Icon = TAB_ICONS[value];
          return (
            <TabsTrigger
              key={value}
              value={value}
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground shrink-0"
            >
              <Icon className="h-4 w-4 me-1.5" />
              {t(`tabs.${value}` as Parameters<typeof t>[0])}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value="company"     className="pt-5"><CompanyTab     initial={systemSettings} /></TabsContent>
      <TabsContent value="financials"  className="pt-5"><FinancialsTab  initial={systemSettings} /></TabsContent>
      <TabsContent value="documents"   className="pt-5"><DocumentsTab   initial={systemSettings} /></TabsContent>
      <TabsContent value="preferences" className="pt-5"><PreferencesTab /></TabsContent>
      <TabsContent value="users"       className="pt-5"><UsersTab       initialUsers={users} initialInvitations={invitations} canInvite={canInvite} /></TabsContent>
      <TabsContent value="appearance"  className="pt-5"><AppearanceTab  /></TabsContent>
    </Tabs>
  );
}
