"use client";

import { useActionState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export function LoginForm() {
  const [state, action, isPending] = useActionState(login, null);
  const t      = useTranslations("login");
  const locale = useLocale();
  const dir    = locale === "he" ? "rtl" : "ltr";

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
          <p className="text-sm text-muted-foreground">{t("tagline")}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
          </div>

          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                required
                disabled={isPending}
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t("passwordLabel")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder={t("passwordPlaceholder")}
                required
                disabled={isPending}
              />
            </div>

            {state?.error && (
              <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
                {state.error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t("submit")}
            </Button>
          </form>
        </div>

        {/* Demo hint */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          {t("demoHint")}
        </p>
      </div>
    </div>
  );
}
