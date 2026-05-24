"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2, ChevronDown, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { createLeadSchema, type CreateLeadInput } from "@/lib/schemas/lead-schema";
import { LEAD_SOURCE_LABELS } from "./lead-status-badge";

type EmployeeOption = { id: string; name: string };

// ─── Demo data ────────────────────────────────────────────────────────────────

export const DEFAULT_CONSTRUCTION_TYPES = [
  "בנייה חדשה",
  "שיפוץ",
  "תוספת בנייה",
  "הריסה ובנייה",
  "שיקום מבנה",
  "עבודות פנים",
  "עבודות חוץ",
  "בנייה מסחרית",
  "בנייה תעשייתית",
  "בנייה ציבורית / מוסדית",
  "תשתיות",
];

export const DEFAULT_CITIES = [
  "תל אביב", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה",
  "אשדוד", "נתניה", "באר שבע", "בני ברק", "רמת גן",
  "הרצליה", "רעננה", "כפר סבא", "מודיעין", "אשקלון",
  "רחובות", "בת ים", "בית שמש", "הוד השרון", "חולון",
  "אילת", "טבריה", "נצרת", "עכו", "נהריה", "קריית שמונה",
  "לוד", "רמלה", "יהוד", "גבעתיים",
];

// ─── Multi-select construction types ─────────────────────────────────────────

export function MultiSelectCreatable({
  options,
  selected,
  onChange,
  placeholder = "בחר סוגי בנייה...",
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
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
          className="flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
      <PopoverContent className="w-72 p-2" dir="rtl" align="start">
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
            placeholder="הוסף סוג בנייה..."
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
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState(DEFAULT_CITIES);
  const [search, setSearch] = useState("");

  const filtered = cities.filter((c) => c.includes(search));
  const canAdd = search.trim() && !cities.includes(search.trim());

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
            {value || "בחר עיר..."}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" dir="rtl" align="start">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חפש עיר..."
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
              הוסף &quot;{search.trim()}&quot;
            </div>
          )}
          {filtered.length === 0 && !canAdd && (
            <p className="text-sm text-muted-foreground px-2 py-3 text-center">לא נמצאה עיר</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NewLeadDialog({ employees = [] }: { employees?: EmployeeOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [constructionTypes, setConstructionTypes] = useState<string[]>([]);
  const [city, setCity] = useState("");

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }));

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      name: "",
      phone: "",
      source: "OTHER" as const,
    },
  });

  const assignedEmployeeId = watch("assignedEmployeeId");

  function handleClose(v: boolean) {
    if (!v) {
      reset();
      setConstructionTypes([]);
      setCity("");
      setServerError(null);
    }
    setOpen(v);
  }

  async function onSubmit(data: CreateLeadInput) {
    setServerError(null);
    const res = await createLead({ ...data, constructionTypes, city: city || undefined });
    if (res.success) {
      toast.success("ליד נוצר בהצלחה");
      handleClose(false);
      router.refresh();
    } else {
      setServerError(res.error);
      toast.error("שגיאה ביצירת הליד");
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 me-1.5" />
          ליד חדש
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto" dir="rtl">
        <SheetHeader className="mb-5">
          <SheetTitle>הוספת ליד חדש</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">שם מלא <span className="text-destructive">*</span></Label>
              <Input id="name" placeholder="ישראל ישראלי" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">טלפון ראשי <span className="text-destructive">*</span></Label>
              <Input id="phone" placeholder="050-1234567" type="tel" dir="ltr" {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
          </div>

          {/* Phone2 + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone2">טלפון נוסף</Label>
              <Input id="phone2" placeholder="03-1234567" type="tel" dir="ltr" {...register("phone2")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" placeholder="israel@example.com" type="email" dir="ltr" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          {/* City + Size */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>עיר</Label>
              <CreatableCitySelect value={city} onChange={setCity} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estimatedSize">גודל משוער (מ&quot;ר)</Label>
              <Input
                id="estimatedSize"
                placeholder="120"
                type="number"
                min={0}
                dir="ltr"
                {...register("estimatedSize")}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="propertyAddress">כתובת הנכס</Label>
            <Input id="propertyAddress" placeholder="רחוב הרצל 1, תל אביב" {...register("propertyAddress")} />
          </div>

          {/* Construction types */}
          <div className="space-y-1.5">
            <Label>סוג בנייה</Label>
            <MultiSelectCreatable
              options={DEFAULT_CONSTRUCTION_TYPES}
              selected={constructionTypes}
              onChange={setConstructionTypes}
            />
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label>מקור ליד</Label>
            <Select
              defaultValue="OTHER"
              onValueChange={(v) => setValue("source", v as CreateLeadInput["source"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assigned employee */}
          {employeeOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label>נציג מטפל</Label>
              <Combobox
                options={employeeOptions}
                value={assignedEmployeeId ?? ""}
                onValueChange={(v) => setValue("assignedEmployeeId", v || undefined)}
                placeholder="בחר נציג..."
                searchPlaceholder="חיפוש עובד..."
                emptyText="לא נמצאו עובדים"
              />
            </div>
          )}

          {/* Budget + Size */}
          <div className="space-y-1.5">
            <Label htmlFor="budget">תקציב משוער (₪)</Label>
            <Input id="budget" placeholder="500000" type="number" dir="ltr" {...register("budget")} />
            {errors.budget && <p className="text-xs text-destructive">{errors.budget.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">הערות</Label>
            <Textarea id="notes" placeholder="פרטים נוספים על הליד..." rows={3} {...register("notes")} />
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <div className="flex justify-end gap-2 pt-2 pb-6">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              שמור ליד
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
