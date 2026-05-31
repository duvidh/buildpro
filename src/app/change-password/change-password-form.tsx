"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { changeOwnPassword } from "@/actions/auth";
import { DEFAULT_PASSWORD } from "@/lib/auth-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, CheckCircle } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export function ChangePasswordForm() {
  const t      = useTranslations("changePassword");
  const locale = useLocale();
  const dir    = locale === "he" ? "rtl" : "ltr";
  const router = useRouter();

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [pending, setPending]     = useState(false);
  const [done, setDone]           = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t("errorTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("errorMismatch"));
      return;
    }
    if (password === DEFAULT_PASSWORD) {
      setError(t("errorSameDefault"));
      return;
    }

    setPending(true);
    const res = await changeOwnPassword(password);
    if ("error" in res) {
      setPending(false);
      if (res.error === "same_as_default")   setError(t("errorSameDefault"));
      else if (res.error === "too_short")    setError(t("errorTooShort"));
      else                                   setError(t("errorGeneric"));
      return;
    }

    setDone(true);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4" dir={dir}>
      {/* Language switcher — top-right corner regardless of RTL/LTR */}
      <div className="fixed top-4 end-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">BuildPro</h1>
          <p className="text-sm text-muted-foreground">{t("pageTitle")}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">{t("newLabel")}</Label>
              <Input
                id="new-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={pending || done}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">{t("confirmLabel")}</Label>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={pending || done}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            {done && (
              <p className="text-sm text-emerald-600 rounded-lg bg-emerald-50 px-3 py-2 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                {t("success")}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={pending || done}>
              {pending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {pending ? t("submitting") : t("submit")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
