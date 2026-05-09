"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Loader2 } from "lucide-react";
import { createProjectSchema, type CreateProjectInput } from "@/lib/schemas/project-schema";
import { createProject } from "@/actions/projects";
import { PROJECT_STATUS_VALUES } from "@/lib/constants/project-enums";

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "תכנון",
  ACTIVE: "פעיל",
  ON_HOLD: "מושהה",
  COMPLETED: "הושלם",
  CANCELLED: "בוטל",
};

type ClientOption = { id: string; name: string };

export function NewProjectDialog({ clients }: { clients: ClientOption[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { status: "PLANNING" },
  });

  function onSubmit(data: CreateProjectInput) {
    startTransition(async () => {
      const res = await createProject(data);
      if (res.success) {
        reset();
        setOpen(false);
        router.push(`/projects/${res.projectId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          פרויקט חדש
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>פרויקט חדש</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="name">שם הפרויקט *</Label>
            <Input id="name" {...register("name")} placeholder="בניית בית, שיפוץ משרד..." />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>לקוח *</Label>
            <Select onValueChange={(v) => setValue("clientId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="בחר לקוח" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && (
              <p className="text-xs text-destructive">{errors.clientId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>סטטוס</Label>
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
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contractValue">ערך חוזה (₪)</Label>
              <Input
                id="contractValue"
                {...register("contractValue")}
                placeholder="0"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">כתובת האתר</Label>
            <Input id="address" {...register("address")} placeholder="רחוב, עיר" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">תאריך התחלה</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">תאריך סיום</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">תיאור</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="תיאור קצר של הפרויקט..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              צור פרויקט
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
