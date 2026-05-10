"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { updateProject } from "@/actions/projects";
import { updateProjectSchema, type UpdateProjectInput } from "@/lib/schemas/project-schema";
import { PROJECT_STATUS_VALUES } from "@/lib/constants/project-enums";

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "תכנון",
  ACTIVE: "פעיל",
  ON_HOLD: "מושהה",
  COMPLETED: "הושלם",
  CANCELLED: "בוטל",
};

type ProjectForEdit = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  contractValue: number;
};

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function EditProjectDialog({ project }: { project: ProjectForEdit }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
      address: project.address ?? "",
      status: project.status as UpdateProjectInput["status"],
      startDate: isoToDateInput(project.startDate),
      endDate: isoToDateInput(project.endDate),
      contractValue: project.contractValue > 0 ? String(project.contractValue) : "",
    },
  });

  async function onSubmit(data: UpdateProjectInput) {
    setServerError(null);
    const res = await updateProject(project.id, data);
    if (res.success) {
      toast.success("הפרויקט עודכן בהצלחה");
      setOpen(false);
      router.refresh();
    } else {
      setServerError(res.error);
      toast.error("שגיאה בעדכון הפרויקט");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Pencil className="h-4 w-4" />
          ערוך פרויקט
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>עריכת פרויקט — {project.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="ep-name">
              שם הפרויקט <span className="text-destructive">*</span>
            </Label>
            <Input id="ep-name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>סטטוס</Label>
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
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-contract">ערך חוזה (₪)</Label>
              <Input id="ep-contract" dir="ltr" {...register("contractValue")} placeholder="0" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-address">כתובת האתר</Label>
            <Input id="ep-address" {...register("address")} placeholder="רחוב, עיר" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ep-start">תאריך התחלה</Label>
              <Input id="ep-start" type="date" {...register("startDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-end">תאריך סיום</Label>
              <Input id="ep-end" type="date" {...register("endDate")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-desc">תיאור</Label>
            <Textarea
              id="ep-desc"
              rows={3}
              {...register("description")}
              placeholder="תיאור קצר של הפרויקט..."
            />
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              שמור שינויים
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
