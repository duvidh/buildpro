"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2 } from "lucide-react";
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
import { Combobox } from "@/components/ui/combobox";
import { createLead } from "@/actions/leads";
import { createLeadSchema, type CreateLeadInput } from "@/lib/schemas/lead-schema";
import { LEAD_SOURCE_LABELS, LEAD_URGENCY_CONFIG } from "./lead-status-badge";

type EmployeeOption = { id: string; name: string };

export function NewLeadDialog({ employees = [] }: { employees?: EmployeeOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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
      urgency: "MEDIUM" as const,
    },
  });

  const assignedEmployeeId = watch("assignedEmployeeId");

  async function onSubmit(data: CreateLeadInput) {
    setServerError(null);
    const res = await createLead(data);
    if (res.success) {
      toast.success("ליד נוצר בהצלחה");
      reset();
      setOpen(false);
      router.refresh();
    } else {
      setServerError(res.error);
      toast.error("שגיאה ביצירת הליד");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 me-1.5" />
          ליד חדש
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>הוספת ליד חדש</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                שם מלא <span className="text-destructive">*</span>
              </Label>
              <Input id="name" placeholder="ישראל ישראלי" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                טלפון ראשי <span className="text-destructive">*</span>
              </Label>
              <Input id="phone" placeholder="050-1234567" type="tel" dir="ltr" {...register("phone")} />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone2">טלפון נוסף</Label>
              <Input id="phone2" placeholder="03-1234567" type="tel" dir="ltr" {...register("phone2")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" placeholder="israel@example.com" type="email" dir="ltr" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="propertyAddress">כתובת הנכס</Label>
            <Input id="propertyAddress" placeholder="רחוב הרצל 1, תל אביב" {...register("propertyAddress")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label>דחיפות</Label>
              <Select
                defaultValue="MEDIUM"
                onValueChange={(v) => setValue("urgency", v as CreateLeadInput["urgency"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_URGENCY_CONFIG).map(([value, cfg]) => (
                    <SelectItem key={value} value={value}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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

          <div className="space-y-1.5">
            <Label htmlFor="budget">תקציב משוער (₪)</Label>
            <Input id="budget" placeholder="500000" type="number" dir="ltr" {...register("budget")} />
            {errors.budget && (
              <p className="text-xs text-destructive">{errors.budget.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">הערות</Label>
            <Textarea id="notes" placeholder="פרטים נוספים על הליד..." rows={3} {...register("notes")} />
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              שמור ליד
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
