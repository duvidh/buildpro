"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { ArrowRight, Building2, Loader2, Phone, Mail, MapPin, FileText, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/actions/clients";
import { buildClientSchema, type ClientInput } from "@/lib/schemas/client-schema";

export default function NewClientPage() {
  const t       = useTranslations("clients");
  const tCommon = useTranslations("common");
  const router  = useRouter();

  // Schema with translated validation messages
  const schema = useMemo(
    () => buildClientSchema({
      nameTooShort: t("validation.nameTooShort"),
      invalidEmail: t("validation.invalidEmail"),
    }),
    [t]
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", contactName: "", phone: "", phone2: "",
      email: "", address: "", companyNumber: "", notes: "",
    },
  });

  async function onSubmit(data: ClientInput) {
    const res = await createClient(data);
    if (res.success) {
      toast.success(t("new.toastSuccess"));
      router.push(`/clients/${res.clientId}`);
    } else {
      toast.error(res.error ?? t("new.toastError"));
    }
  }

  const tf = (k: string) => t(k as Parameters<typeof t>[0]);

  return (
    <div className="w-full space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
          <Link href="/clients">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground leading-tight">{t("new.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("new.subtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-5">

          {/* ── Section: Identity ── */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/30">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{t("new.sectionIdentity")}</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="name">
                  {tf("form.fields.name")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder={tf("form.placeholders.name")}
                  className="text-base"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactName">
                  <User className="inline h-3.5 w-3.5 me-1 mb-0.5 text-muted-foreground" />
                  {tf("form.fields.contactName")}
                </Label>
                <Input
                  id="contactName"
                  placeholder={tf("form.placeholders.contactName")}
                  {...register("contactName")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="companyNumber">
                  <FileText className="inline h-3.5 w-3.5 me-1 mb-0.5 text-muted-foreground" />
                  {tf("form.fields.companyNumber")}
                </Label>
                <Input
                  id="companyNumber"
                  dir="ltr"
                  placeholder={tf("form.placeholders.companyNumber")}
                  {...register("companyNumber")}
                />
              </div>
            </div>
          </div>

          {/* ── Section: Contact ── */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/30">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{t("new.sectionContact")}</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  <Phone className="inline h-3.5 w-3.5 me-1 mb-0.5 text-muted-foreground" />
                  {tf("form.fields.phone")}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  dir="ltr"
                  placeholder={tf("form.placeholders.phone")}
                  {...register("phone")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone2">
                  <Phone className="inline h-3.5 w-3.5 me-1 mb-0.5 text-muted-foreground" />
                  {tf("form.fields.phone2")}
                </Label>
                <Input
                  id="phone2"
                  type="tel"
                  dir="ltr"
                  placeholder={tf("form.placeholders.phone2")}
                  {...register("phone2")}
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="email">
                  <Mail className="inline h-3.5 w-3.5 me-1 mb-0.5 text-muted-foreground" />
                  {tf("form.fields.email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  placeholder={tf("form.placeholders.email")}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Section: Address & Notes ── */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/30">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{t("new.sectionAddrNotes")}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="address">{tf("form.fields.address")}</Label>
                <Input
                  id="address"
                  placeholder={tf("form.placeholders.address")}
                  {...register("address")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">{tf("form.fields.notes")}</Label>
                <Textarea
                  id="notes"
                  placeholder={tf("form.placeholders.notes")}
                  rows={4}
                  {...register("notes")}
                />
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <Button type="button" variant="ghost" asChild>
              <Link href="/clients">{tCommon("cancel")}</Link>
            </Button>
            <Button type="submit" size="lg" disabled={isSubmitting} className="min-w-[140px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {t("new.creating")}
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 me-2" />
                  {t("new.create")}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
