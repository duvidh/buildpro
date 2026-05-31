"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { updateProject } from "@/actions/projects";
import { buildUpdateProjectSchema, type UpdateProjectInput } from "@/lib/schemas/project-schema";
import { PROJECT_STATUS_VALUES } from "@/lib/constants/project-enums";

type ProjectForEdit = {
  id:            string;
  name:          string;
  description:   string | null;
  address:       string | null;
  status:        string;
  startDate:     string | null;
  endDate:       string | null;
  contractValue: number;
  latitude?:     number | null;
  longitude?:    number | null;
};

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function EditProjectDialog({ project }: { project: ProjectForEdit }) {
  const t       = useTranslations("projects");
  const tCommon = useTranslations("common");
  const router  = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(
    () => buildUpdateProjectSchema({ nameTooShort: t("validation.nameTooShort") }),
    [t]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:          project.name,
      description:   project.description ?? "",
      address:       project.address ?? "",
      status:        project.status as UpdateProjectInput["status"],
      startDate:     isoToDateInput(project.startDate),
      endDate:       isoToDateInput(project.endDate),
      contractValue: project.contractValue > 0 ? String(project.contractValue) : "",
      latitude:      project.latitude ?? null,
      longitude:     project.longitude ?? null,
    },
  });

  const addressValue = watch("address") ?? "";

  async function onSubmit(data: UpdateProjectInput) {
    setServerError(null);
    const res = await updateProject(project.id, data);
    if (res.success) {
      toast.success(t("edit.toastSuccess"));
      setOpen(false);
      router.refresh();
    } else {
      setServerError(res.error);
      toast.error(t("edit.toastError"));
    }
  }

  // Shorthand for dynamic form key lookups
  const tf = (k: string) => t(k as Parameters<typeof t>[0]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Pencil className="h-4 w-4" />
          {t("edit.trigger")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit.title", { name: project.name })}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="ep-name">
              {tf("form.fields.name")} <span className="text-destructive">*</span>
            </Label>
            <Input id="ep-name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{tf("form.fields.status")}</Label>
              <Select
                defaultValue={project.status}
                onValueChange={(v) => setValue("status", v as UpdateProjectInput["status"])}
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
              <Label htmlFor="ep-contract">{tf("form.fields.contractValue")}</Label>
              <Input id="ep-contract" dir="ltr" {...register("contractValue")} placeholder="0" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-address">{tf("form.fields.address")}</Label>
            <AddressAutocomplete
              id="ep-address"
              dir="rtl"
              value={addressValue}
              placeholder={tf("form.placeholders.address")}
              onChange={(v) => {
                setValue("address", v);
                setValue("latitude", null);
                setValue("longitude", null);
              }}
              onSelect={(r) => {
                setValue("address", r.label);
                setValue("latitude", r.lat);
                setValue("longitude", r.lon);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ep-start">{tf("form.fields.startDate")}</Label>
              <Input id="ep-start" type="date" {...register("startDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-end">{tf("form.fields.endDate")}</Label>
              <Input id="ep-end" type="date" {...register("endDate")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-desc">{tf("form.fields.description")}</Label>
            <Textarea
              id="ep-desc"
              rows={3}
              {...register("description")}
              placeholder={tf("form.placeholders.description")}
            />
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              {t("edit.saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
