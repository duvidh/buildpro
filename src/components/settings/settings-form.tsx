"use client";

import { useState, useTransition } from "react";
import { Building2, Phone, Mail, MapPin, Hash, Save, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { saveAllSettings } from "@/actions/settings";

type Settings = Record<string, string>;

export function SettingsForm({ initial }: { initial: Settings }) {
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

  const fields: {
    key: keyof typeof form;
    label: string;
    placeholder: string;
    icon: React.ElementType;
    type?: string;
  }[] = [
    { key: "company_name",    label: "שם החברה",         placeholder: "BuildPro בניה ופיתוח בע״מ", icon: Building2 },
    { key: "company_phone",   label: "טלפון",             placeholder: "03-1234567",                 icon: Phone },
    { key: "company_email",   label: "דוא״ל",             placeholder: "office@company.co.il",      icon: Mail,     type: "email" },
    { key: "company_address", label: "כתובת",             placeholder: "רחוב הרצל 1, תל אביב",      icon: MapPin },
    { key: "company_vat",     label: "מספר ח.פ / ע.מ",   placeholder: "123456789",                  icon: Hash },
  ];

  return (
    <div className="space-y-6">
      {/* Company info */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">פרטי החברה</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            הפרטים יופיעו בהצעות מחיר, חשבוניות ומסמכים.
          </p>
        </div>
        <Separator />
        <div className="space-y-4">
          {fields.map(({ key, label, placeholder, icon: Icon, type }) => (
            <div key={key} className="grid grid-cols-3 items-center gap-4">
              <Label className="text-end text-sm text-muted-foreground">{label}</Label>
              <div className="col-span-2 relative">
                <Icon className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type={type ?? "text"}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="pe-9"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System info (read-only) */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">מידע מערכת</h2>
        </div>
        <Separator />
        <div className="space-y-2">
          {[
            { label: "גרסת מערכת",  value: "BuildPro v1.0" },
            { label: "מסד נתונים",  value: "SQLite (פיתוח)" },
            { label: "מטבע",         value: "שקל ישראלי (₪ ILS)" },
            { label: "שפה",          value: "עברית (he-IL)" },
          ].map(({ label, value }) => (
            <div key={label} className="grid grid-cols-3 items-center gap-4">
              <p className="text-end text-xs text-muted-foreground">{label}</p>
              <p className="col-span-2 text-sm text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end items-center gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            ההגדרות נשמרו
          </span>
        )}
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 me-1.5" />
          שמור הגדרות
        </Button>
      </div>
    </div>
  );
}
