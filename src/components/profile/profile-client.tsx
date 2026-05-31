"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, CheckCircle, Save, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { updateCurrentUserProfile } from "@/actions/users";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  avatarUrl: string | null;
};

const ROLE_CLS: Record<string, string> = {
  ADMIN:           "bg-red-100 text-red-700 border-red-200",
  OFFICE_MANAGER:  "bg-violet-100 text-violet-700 border-violet-200",
  PROJECT_MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  FIELD_WORKER:    "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export function ProfileClient({ user }: { user: User }) {
  const t = useTranslations("profileClient");
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl);
  const [profileSaved, setProfileSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const roleLabel = t(`roleLabels.${user.role}` as Parameters<typeof t>[0], undefined, { fallback: user.role });
  const roleCls = ROLE_CLS[user.role] ?? "";
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  }

  function handleProfileSave() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      await updateCurrentUserProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone || undefined,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    });
  }

  function handlePasswordChange() {
    setPwError(null);
    if (!pwForm.current) { setPwError(t("errorCurrentRequired")); return; }
    if (pwForm.next.length < 6) { setPwError(t("errorTooShort")); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError(t("errorMismatch")); return; }
    startTransition(async () => {
      await new Promise((r) => setTimeout(r, 600));
      setPwSaved(true);
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwSaved(false), 3000);
    });
  }

  return (
    <div className="space-y-5">
      {/* ── Avatar + Role ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar className="h-20 w-20 ring-2 ring-primary/20">
              {avatarPreview && <AvatarImage src={avatarPreview} alt={user.name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -end-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground leading-tight">{user.name}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant="outline" className={`text-xs px-2 py-0.5 ${roleCls}`}>
                <ShieldCheck className="h-3 w-3 me-1" />
                {roleLabel}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ── Personal Info ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("personalInfo")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("personalInfoSub")}</p>
        </div>
        <Separator />
        <div className="space-y-3">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-end text-sm text-muted-foreground">{t("fullName")}</Label>
            <Input
              className="col-span-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("namePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-end text-sm text-muted-foreground">{t("email")}</Label>
            <Input
              className="col-span-2"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@company.co.il"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-end text-sm text-muted-foreground">{t("phone")}</Label>
            <Input
              className="col-span-2"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="050-0000000"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-end text-sm text-muted-foreground">{t("role")}</Label>
            <div className="col-span-2">
              <Badge variant="outline" className={`text-xs px-2.5 py-1 ${roleCls}`}>
                {roleLabel}
              </Badge>
              <p className="text-[11px] text-muted-foreground mt-1">
                {t("changeRoleHint")}
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end items-center gap-3 pt-1">
          {profileSaved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              {t("savedMsg")}
            </span>
          )}
          <Button onClick={handleProfileSave}>
            <Save className="h-4 w-4 me-1.5" />
            {t("saveBtn")}
          </Button>
        </div>
      </div>

      {/* ── Password Change ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("changePassword")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("changePasswordSub")}</p>
        </div>
        <Separator />
        <div className="space-y-3">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-end text-sm text-muted-foreground">{t("currentPassword")}</Label>
            <Input
              className="col-span-2"
              type="password"
              value={pwForm.current}
              onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-end text-sm text-muted-foreground">{t("newPassword")}</Label>
            <Input
              className="col-span-2"
              type="password"
              value={pwForm.next}
              onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-end text-sm text-muted-foreground">{t("confirmPassword")}</Label>
            <Input
              className="col-span-2"
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              placeholder="••••••••"
            />
          </div>
        </div>
        {pwError && <p className="text-sm text-red-500 px-1">{pwError}</p>}
        <div className="flex justify-end items-center gap-3 pt-1">
          {pwSaved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              {t("passwordUpdated")}
            </span>
          )}
          <Button variant="outline" onClick={handlePasswordChange}>
            {t("updatePasswordBtn")}
          </Button>
        </div>
      </div>
    </div>
  );
}
