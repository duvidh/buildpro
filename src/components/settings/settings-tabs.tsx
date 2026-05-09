"use client";

import { useState, useTransition } from "react";
import {
  Building2,
  BellRing,
  Users,
  ShieldCheck,
  Save,
  CheckCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveAllSettings } from "@/actions/settings";
import { updateUserRole, toggleUserActive } from "@/actions/users";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  active: boolean;
  createdAt: Date;
};

const ROLE_OPTIONS = [
  { value: "ADMIN",           label: "מנהל מערכת" },
  { value: "OFFICE_MANAGER",  label: "מנהל משרד" },
  { value: "PROJECT_MANAGER", label: "מנהל פרויקט" },
  { value: "FIELD_WORKER",    label: "עובד שטח" },
];

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  ADMIN:           { label: "מנהל מערכת",  cls: "bg-red-100 text-red-700 border-red-200" },
  OFFICE_MANAGER:  { label: "מנהל משרד",   cls: "bg-violet-100 text-violet-700 border-violet-200" },
  PROJECT_MANAGER: { label: "מנהל פרויקט", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  FIELD_WORKER:    { label: "עובד שטח",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

// ─── Company Tab ──────────────────────────────────────────────────────────────

function CompanyTab({ initial }: { initial: Record<string, string> }) {
  const [form, setForm] = useState({
    company_name:    initial.company_name    ?? "BuildPro בניה ופיתוח בע״מ",
    company_phone:   initial.company_phone   ?? "",
    company_email:   initial.company_email   ?? "",
    company_address: initial.company_address ?? "",
    company_vat:     initial.company_vat     ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await saveAllSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  const fields: { key: keyof typeof form; label: string; placeholder: string; type?: string }[] = [
    { key: "company_name",    label: "שם החברה",       placeholder: "BuildPro בניה ופיתוח בע״מ" },
    { key: "company_phone",   label: "טלפון",           placeholder: "03-1234567" },
    { key: "company_email",   label: "דוא״ל",           placeholder: "office@company.co.il", type: "email" },
    { key: "company_address", label: "כתובת",           placeholder: "רחוב הרצל 1, תל אביב" },
    { key: "company_vat",     label: "מספר ח.פ / ע.מ", placeholder: "123456789" },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">פרטי החברה</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            פרטים אלו יופיעו בהצעות המחיר, חשבוניות ומסמכים.
          </p>
        </div>
        <Separator />
        <div className="space-y-3">
          {fields.map(({ key, label, placeholder, type }) => (
            <div key={key} className="grid grid-cols-3 items-center gap-4">
              <Label className="text-end text-sm text-muted-foreground">{label}</Label>
              <Input
                className="col-span-2"
                type={type ?? "text"}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end items-center gap-3 pt-1">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              ההגדרות נשמרו
            </span>
          )}
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 me-1.5" />
            שמור
          </Button>
        </div>
      </div>

      {/* Logo upload (mock) */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">לוגו החברה</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            הלוגו יופיע בהצעות המחיר ובמסמכים הרשמיים.
          </p>
        </div>
        <Separator />
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground text-xs text-center p-1">
            לוגו
          </div>
          <div className="space-y-1.5">
            <Button variant="outline" size="sm" className="text-xs">
              העלאת לוגו
            </Button>
            <p className="text-[11px] text-muted-foreground">PNG, JPG עד 2MB</p>
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">מידע מערכת</h3>
        <Separator />
        {[
          { label: "גרסת מערכת", value: "BuildPro v1.0" },
          { label: "מסד נתונים", value: "SQLite (פיתוח)" },
          { label: "מטבע",        value: "שקל ישראלי (₪ ILS)" },
          { label: "שפה",         value: "עברית (he-IL)" },
        ].map(({ label, value }) => (
          <div key={label} className="grid grid-cols-3 items-center gap-4">
            <p className="text-end text-xs text-muted-foreground">{label}</p>
            <p className="col-span-2 text-sm">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Preferences Tab ──────────────────────────────────────────────────────────

function PreferencesTab() {
  const [prefs, setPrefs] = useState({
    notif_tasks: true,
    notif_invoices: true,
    notif_leads: false,
    notif_daily: true,
    notif_safety: true,
    compact_view: false,
  });
  const [saved, setSaved] = useState(false);

  const toggles: { key: keyof typeof prefs; label: string; description: string }[] = [
    { key: "notif_tasks",    label: "התראות משימות",         description: "קבל התראה כשמשימה מוקצית אליך או משנה סטטוס" },
    { key: "notif_invoices", label: "התראות חשבוניות",       description: "קבל התראה על חשבוניות שמועד הפירעון שלהן מתקרב" },
    { key: "notif_leads",    label: "התראות לידים חדשים",    description: "קבל התראה כשנכנס ליד חדש" },
    { key: "notif_daily",    label: "תזכורת יומן עבודה",     description: "תזכורת יומית להגשת יומן עבודה (בוקר)" },
    { key: "notif_safety",   label: "אירועי בטיחות דחופים",  description: "התראה מיידית על כל דיווח בטיחות" },
    { key: "compact_view",   label: "תצוגה קומפקטית",        description: "הצג טבלאות עם שורות צפופות יותר" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">העדפות התראות וממשק</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          הגדרות אלו חלות על החשבון האישי שלך.
        </p>
      </div>
      <Separator />
      <div className="divide-y divide-border">
        {toggles.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between py-3 px-1">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
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
            ההעדפות נשמרו
          </span>
        )}
        <Button
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}
        >
          <Save className="h-4 w-4 me-1.5" />
          שמור העדפות
        </Button>
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [, startTransition] = useTransition();

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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">משתמשי המערכת</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            הקצאת תפקידים ושליטה בגישה. שינוי תפקיד נכנס לתוקף מיידית.
          </p>
        </div>
        <Separator />
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs">משתמש</th>
                <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs hidden sm:table-cell">דוא״ל</th>
                <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs">תפקיד</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3 text-xs">פעיל</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const badge = ROLE_BADGE[u.role] ?? { label: u.role, cls: "" };
                return (
                  <tr key={u.id} className={`hover:bg-muted/20 transition-colors ${!u.active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {u.name[0]}
                        </div>
                        <div>
                          <p className="font-medium leading-none">{u.name}</p>
                          <Badge variant="outline" className={`text-[10px] mt-0.5 px-1.5 py-0 ${badge.cls}`}>
                            <ShieldCheck className="h-2.5 w-2.5 me-0.5" />
                            {badge.label}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v)}>
                        <SelectTrigger className="h-7 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
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
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
          <strong>הערה:</strong> שינוי תפקיד ל״עובד שטח״ מגביל גישה למידע פיננסי ולסכומי חוזים.
          ADMIN הוא התפקיד היחיד עם גישה מלאה לדוחות רווח/הפסד.
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SettingsTabs({
  systemSettings,
  users,
}: {
  systemSettings: Record<string, string>;
  users: User[];
}) {
  return (
    <Tabs defaultValue="company" dir="rtl">
      <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto gap-0">
        {[
          { value: "company",     icon: Building2,  label: "פרטי חברה" },
          { value: "preferences", icon: BellRing,   label: "הגדרות אישיות" },
          { value: "users",       icon: Users,       label: "משתמשים והרשאות" },
        ].map(({ value, icon: Icon, label }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground shrink-0"
          >
            <Icon className="h-4 w-4 me-1.5" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="company" className="pt-5">
        <CompanyTab initial={systemSettings} />
      </TabsContent>

      <TabsContent value="preferences" className="pt-5">
        <PreferencesTab />
      </TabsContent>

      <TabsContent value="users" className="pt-5">
        <UsersTab initialUsers={users} />
      </TabsContent>
    </Tabs>
  );
}
