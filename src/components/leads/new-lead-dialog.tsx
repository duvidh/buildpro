"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2, ChevronDown, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createLead } from "@/actions/leads";
import { useMeasurement } from "@/lib/measurement-context";
import { buildLeadSchema, type CreateLeadInput } from "@/lib/schemas/lead-schema";
import { LEAD_SOURCE_VALUES } from "@/lib/constants/lead-enums";

type EmployeeOption = { id: string; name: string };

// City and construction type data is loaded from i18n messages at runtime
// (see leads.defaultCities / leads.defaultConstructionTypes in messages/)

// ─── Multi-select construction types ─────────────────────────────────────────

export function MultiSelectCreatable({
  options,
  selected,
  onChange,
  placeholder,
  addPlaceholder,
}: {
  options:        string[];
  selected:       string[];
  onChange:       (v: string[]) => void;
  placeholder?:   string;
  addPlaceholder?: string;
}) {
  const locale = useLocale();
  const dir    = locale === "he" ? "rtl" : "ltr";

  const [open, setOpen]             = useState(false);
  const [allOptions, setAllOptions] = useState(options);
  const [customInput, setCustomInput] = useState("");

  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  }

  function addCustom() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!allOptions.includes(trimmed)) setAllOptions((prev) => [...prev, trimmed]);
    if (!selected.includes(trimmed)) onChange([...selected, trimmed]);
    setCustomInput("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
              {selected.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs gap-1">
                  {s}
                  <span
                    role="button"
                    className="cursor-pointer hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); toggle(s); }}
                  >
                    <X className="h-2.5 w-2.5" />
                  </span>
                </Badge>
              ))}
            </div>
          )}
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ms-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" dir={dir} align="start">
        <div className="max-h-52 overflow-y-auto space-y-0.5">
          {allOptions.map((opt) => (
            <div
              key={opt}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
              onClick={() => toggle(opt)}
            >
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected.includes(opt) ? "bg-primary border-primary" : "border-input"}`}>
                {selected.includes(opt) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </span>
              <span className="text-sm">{opt}</span>
            </div>
          ))}
        </div>
        <Separator className="my-2" />
        <div className="flex gap-2">
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder={addPlaceholder}
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-2"
            onClick={addCustom}
            disabled={!customInput.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Creatable city select ────────────────────────────────────────────────────

export function CreatableCitySelect({
  value,
  onChange,
}: {
  value:    string;
  onChange: (v: string) => void;
}) {
  const t      = useTranslations("leads.form");
  const tLeads = useTranslations("leads");
  const locale = useLocale();
  const dir    = locale === "he" ? "rtl" : "ltr";

  const [open, setOpen]   = useState(false);
  const [cities, setCities] = useState(() => tLeads.raw("defaultCities") as string[]);
  const [search, setSearch] = useState("");

  const filtered = cities.filter((c) => c.includes(search));
  const canAdd   = search.trim() && !cities.includes(search.trim());

  function select(city: string) {
    onChange(city);
    setOpen(false);
    setSearch("");
  }

  function addCity() {
    const trimmed = search.trim();
    if (!trimmed) return;
    setCities((prev) => [...prev, trimmed]);
    select(trimmed);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {value || t("placeholders.selectCity")}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" dir={dir} align="start">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("placeholders.searchCity")}
          className="h-8 text-sm mb-2"
          autoFocus
        />
        <div className="max-h-52 overflow-y-auto space-y-0.5">
          {filtered.map((city) => (
            <div
              key={city}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
              onClick={() => select(city)}
            >
              {value === city && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              <span className={value === city ? "font-medium" : ""}>{city}</span>
            </div>
          ))}
          {canAdd && (
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm text-primary"
              onClick={addCity}
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              {t("addCity")} &quot;{search.trim()}&quot;
            </div>
          )}
          {filtered.length === 0 && !canAdd && (
            <p className="text-sm text-muted-foreground px-2 py-3 text-center">
              {t("cityNotFound")}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Inline form body (shared with edit) ─────────────────────────────────────

export function LeadFormBody({
  employees,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  employees:      EmployeeOption[];
  defaultValues?: Partial<CreateLeadInput> & { constructionTypes?: string[]; city?: string };
  onSubmit:       (data: CreateLeadInput, constructionTypes: string[], city: string) => Promise<void>;
  onCancel:       () => void;
  submitLabel?:   string;
}) {
  const t      = useTranslations("leads");
  const tCommon = useTranslations("common");
  const { areaUnit } = useMeasurement();

  // Build schema with translated validation messages
  const schema = useMemo(
    () => buildLeadSchema({
      nameTooShort: t("validation.nameTooShort"),
      invalidPhone: t("validation.invalidPhone"),
      invalidEmail: t("validation.invalidEmail"),
    }),
    [t]
  );

  const [constructionTypes, setConstructionTypes] = useState<string[]>(
    defaultValues?.constructionTypes ?? []
  );
  const [city, setCity] = useState(defaultValues?.city ?? "");

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }));

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:   "",
      phone:  "",
      source: "OTHER" as const,
      ...defaultValues,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const assignedEmployeeId = watch("assignedEmployeeId");

  async function handleFormSubmit(data: CreateLeadInput) {
    await onSubmit(data, constructionTypes, city);
  }

  const tf = t as (k: string) => string; // shorthand for form.fields / form.placeholders

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Name + Phone */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lf-name">
            {tf("form.fields.name")} <span className="text-destructive">*</span>
          </Label>
          <Input id="lf-name" placeholder={tf("form.placeholders.name")} {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lf-phone">
            {tf("form.fields.phone")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lf-phone"
            placeholder={tf("form.placeholders.phone")}
            type="tel"
            dir="ltr"
            {...register("phone")}
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
      </div>

      {/* Secondary Phone + Email */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lf-phone2">{tf("form.fields.phone2")}</Label>
          <Input
            id="lf-phone2"
            placeholder={tf("form.placeholders.phone2")}
            type="tel"
            dir="ltr"
            {...register("phone2")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lf-email">{tf("form.fields.email")}</Label>
          <Input
            id="lf-email"
            placeholder={tf("form.placeholders.email")}
            type="email"
            dir="ltr"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
      </div>

      {/* Address + City */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lf-address">{tf("form.fields.address")}</Label>
          <Input
            id="lf-address"
            placeholder={tf("form.placeholders.address")}
            {...register("propertyAddress")}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{tf("form.fields.city")}</Label>
          <CreatableCitySelect value={city} onChange={setCity} />
        </div>
      </div>

      {/* Lead Source + Assigned Rep */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{tf("form.fields.source")}</Label>
          <Select
            defaultValue={defaultValues?.source ?? "OTHER"}
            onValueChange={(v) => setValue("source", v as CreateLeadInput["source"])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_SOURCE_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {tf(`source.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {employeeOptions.length > 0 && (
          <div className="space-y-1.5">
            <Label>{tf("form.fields.assignedRep")}</Label>
            <Combobox
              options={employeeOptions}
              value={assignedEmployeeId ?? ""}
              onValueChange={(v) => setValue("assignedEmployeeId", v || undefined)}
              placeholder={tf("form.placeholders.selectRep")}
              searchPlaceholder={tf("form.placeholders.searchEmp")}
              emptyText={tf("form.placeholders.noEmployees")}
            />
          </div>
        )}
      </div>

      {/* Construction Type + Budget + Size */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>{tf("form.fields.constructionType")}</Label>
          <MultiSelectCreatable
            options={t.raw("defaultConstructionTypes") as string[]}
            selected={constructionTypes}
            onChange={setConstructionTypes}
            placeholder={tf("form.placeholders.selectTypes")}
            addPlaceholder={tf("form.placeholders.addType")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lf-budget">{tf("form.fields.budget")}</Label>
          <Input
            id="lf-budget"
            placeholder={tf("form.placeholders.budget")}
            type="number"
            dir="ltr"
            {...register("budget")}
          />
          {errors.budget && <p className="text-xs text-destructive">{errors.budget.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lf-size">{tf("form.fields.size")} ({areaUnit})</Label>
          <Input
            id="lf-size"
            placeholder="120"
            type="number"
            min={0}
            dir="ltr"
            {...register("estimatedSize")}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="lf-notes">{tf("form.fields.notes")}</Label>
        <Textarea
          id="lf-notes"
          placeholder={tf("form.placeholders.notes")}
          rows={3}
          {...register("notes")}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
          {submitLabel ?? t("form.saveLead")}
        </Button>
      </div>
    </form>
  );
}

// ─── Main export: button + inline expandable form ─────────────────────────────

export function NewLeadDialog({ employees: _employees = [] }: { employees?: EmployeeOption[] }) {
  const t    = useTranslations("leads");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 me-1.5" />
        {t("newLead")}
      </Button>
    );
  }

  return <div className="col-span-full w-full" />;
}

// ─── Section wrapper used in leads page ──────────────────────────────────────

export function NewLeadSection({ employees = [] }: { employees?: EmployeeOption[] }) {
  const t      = useTranslations("leads");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(data: CreateLeadInput, constructionTypes: string[], city: string) {
    const res = await createLead({ ...data, constructionTypes, city: city || undefined });
    if (res.success) {
      toast.success(t("form.toastSuccess"));
      setOpen(false);
      router.refresh();
    } else {
      toast.error(t("form.toastError"));
    }
  }

  return (
    <div className="space-y-3">
      {/* Button row */}
      <div className="flex justify-end">
        {open ? (
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            <X className="h-4 w-4 me-1.5" />
            {t("close")}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 me-1.5" />
            {t("newLead")}
          </Button>
        )}
      </div>

      {/* Inline form card */}
      {open && (
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("form.addNew")}</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadFormBody
              employees={employees}
              onSubmit={handleSubmit}
              onCancel={() => setOpen(false)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
