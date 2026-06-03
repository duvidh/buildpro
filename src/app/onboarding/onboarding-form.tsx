"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createCompany } from "@/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export function OnboardingForm() {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const dir = locale === "he" ? "rtl" : "ltr";

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(t("errorRequired"));
      return;
    }
    startTransition(async () => {
      const res = await createCompany(name, locale === "he" ? "he" : "en");
      // On success the action redirects server-side; we only get here on error.
      if (res?.error) {
        setError(res.error === "name_required" ? t("errorRequired") : t("errorGeneric"));
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4" dir={dir}>
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
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName">{t("nameLabel")}</Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                autoComplete="organization"
                placeholder={t("namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isPending}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isPending ? t("submitting") : t("submit")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
