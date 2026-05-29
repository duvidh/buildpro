"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvitation } from "@/actions/invitations";

const ROLE_LABELS: Record<string, { en: string; he: string }> = {
  ADMIN:           { en: "System Admin",    he: "מנהל מערכת"    },
  OFFICE_MANAGER:  { en: "Office Manager",  he: "מנהל/ת משרד"   },
  PROJECT_MANAGER: { en: "Project Manager", he: "מנהל פרויקטים" },
  FIELD_WORKER:    { en: "Field Worker",    he: "איש שטח"       },
};

export function AcceptForm({
  token,
  email,
  role,
  locale,
}: {
  token: string;
  email: string;
  role: string;
  locale: string;
}) {
  const t = useTranslations("invite");
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name,     setName]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [done,     setDone]     = useState(false);
  const [loading,  setLoading]  = useState(false);

  const roleLabel =
    locale === "he"
      ? (ROLE_LABELS[role]?.he ?? role)
      : (ROLE_LABELS[role]?.en ?? role);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8)        { setError(t("errorPasswordLength")); return; }
    if (password !== confirm)        { setError(t("errorPasswordMatch"));  return; }

    setLoading(true);
    startTransition(async () => {
      const res = await acceptInvitation(token, name, password);
      setLoading(false);
      if ("error" in res) {
        if (res.error === "expired")          setError(t("errorExpired"));
        else if (res.error === "user_exists") setError(t("errorUserExists"));
        else                                  setError(t("errorGeneric"));
      } else {
        setDone(true);
      }
    });
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-7 w-7 text-emerald-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold">{t("successTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("successSubtitle")}</p>
        <Button className="mt-2" onClick={() => router.push("/login")}>
          {t("goToLogin")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Invited-as badge */}
      <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-2.5 text-sm text-indigo-700 flex items-center gap-2">
        <span className="text-indigo-400">✉</span>
        <span>{t("invitedAs")}: <strong>{email}</strong></span>
        <span className="ms-auto text-xs font-medium bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{roleLabel}</span>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input
          id="name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          autoComplete="name"
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("passwordLabel")}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPw ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            autoComplete="new-password"
            className="pe-10"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Confirm */}
      <div className="space-y-1.5">
        <Label htmlFor="confirm">{t("confirmLabel")}</Label>
        <Input
          id="confirm"
          type={showPw ? "text" : "password"}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={t("confirmPlaceholder")}
          autoComplete="new-password"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("submitting")}</>
        ) : (
          t("submit")
        )}
      </Button>
    </form>
  );
}
