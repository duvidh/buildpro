"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  FolderKanban, Building2, CalendarDays,
  Wallet, MapPin, AlignLeft, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { buildCreateProjectSchema, type CreateProjectInput } from "@/lib/schemas/project-schema";
import { createProject } from "@/actions/projects";
import { PROJECT_STATUS_VALUES } from "@/lib/constants/project-enums";

type ClientOption = { id: string; name: string; address: string };

export function NewProjectForm({ clients }: { clients: ClientOption[] }) {
  const t       = useTranslations("projects");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const schema = useMemo(
    () => buildCreateProjectSchema({
      nameTooShort:   t("validation.nameTooShort"),
      clientRequired: t("validation.clientRequired"),
    }),
    [t]
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(schema),
    defaultValues: { status: "PLANNING" },
  });

  const clientComboOptions = clients.map((c) => ({ value: c.id, label: c.name }));

  function handleClientChange(clientId: string) {
    setValue("clientId", clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client?.address) setValue("address", client.address);
  }

  function onSubmit(data: CreateProjectInput) {
    startTransition(async () => {
      const res = await createProject(data);
      if (res.success) {
        toast.success(t("new.toastSuccess"));
        router.push(`/projects/${res.projectId}`);
      } else {
        toast.error(t("new.toastError"));
      }
    });
  }

  // Shorthand for dynamic form key lookups
  const tf = (k: string) => t(k as Parameters<typeof t>[0]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-5">

        {/* ── Section: Identity ── */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/30">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
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

            <div className="sm:col-span-2 space-y-1.5">
              <Label>
                <Building2 className="inline h-3.5 w-3.5 me-1 mb-0.5 text-muted-foreground" />
                {tf("form.fields.client")} <span className="text-destructive">*</span>
              </Label>
              <Combobox
                options={clientComboOptions}
                onValueChange={handleClientChange}
                placeholder={tf("form.placeholders.client")}
                searchPlaceholder={tf("form.placeholders.clientSearch")}
                emptyText={tf("form.placeholders.clientEmpty")}
              />
              {errors.clientId && (
                <p className="text-xs text-destructive">{errors.clientId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{tf("form.fields.status")}</Label>
              <Select
                defaultValue="PLANNING"
                onValueChange={(v) =>
                  setValue("status", v as (typeof PROJECT_STATUS_VALUES)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUS_VALUES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {tf(`status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contractValue">
                <Wallet className="inline h-3.5 w-3.5 me-1 mb-0.5 text-muted-foreground" />
                {tf("form.fields.contractValue")}
              </Label>
              <Input
                id="contractValue"
                dir="ltr"
                placeholder="0"
                {...register("contractValue")}
              />
            </div>
          </div>
        </div>

        {/* ── Section: Location & Dates ── */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/30">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">{t("new.sectionLocation")}</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="address">
                <MapPin className="inline h-3.5 w-3.5 me-1 mb-0.5 text-muted-foreground" />
                {tf("form.fields.address")}
              </Label>
              <Input
                id="address"
                placeholder={tf("form.placeholders.address")}
                {...register("address")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="startDate">
                <CalendarDays className="inline h-3.5 w-3.5 me-1 mb-0.5 text-muted-foreground" />
                {tf("form.fields.startDate")}
              </Label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endDate">
                <CalendarDays className="inline h-3.5 w-3.5 me-1 mb-0.5 text-muted-foreground" />
                {tf("form.fields.endDate")}
              </Label>
              <Input id="endDate" type="date" {...register("endDate")} />
            </div>
          </div>
        </div>

        {/* ── Section: Description ── */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/30">
            <AlignLeft className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">{t("new.sectionDesc")}</h2>
          </div>
          <div className="p-5">
            <Textarea
              id="description"
              placeholder={tf("form.placeholders.description")}
              rows={4}
              {...register("description")}
            />
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Button type="button" variant="ghost" asChild>
            <Link href="/projects">{tCommon("cancel")}</Link>
          </Button>
          <Button type="submit" size="lg" disabled={isPending} className="min-w-[160px]">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {t("new.creating")}
              </>
            ) : (
              <>
                <FolderKanban className="h-4 w-4 me-2" />
                {t("new.create")}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
