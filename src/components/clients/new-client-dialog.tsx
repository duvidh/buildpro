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
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/actions/clients";
import { clientSchema, type ClientInput } from "@/lib/schemas/client-schema";

export function NewClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      contactName: "",
      phone: "",
      phone2: "",
      email: "",
      address: "",
      companyNumber: "",
      notes: "",
    },
  });

  async function onSubmit(data: ClientInput) {
    setServerError(null);
    const res = await createClient(data);
    if (res.success) {
      toast.success("לקוח נוצר בהצלחה");
      reset();
      setOpen(false);
      router.push(`/clients/${res.clientId}`);
    } else {
      setServerError(res.error);
      toast.error("שגיאה ביצירת הלקוח");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 me-1.5" />
          לקוח חדש
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>הוספת לקוח חדש</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="nc-name">
              שם לקוח <span className="text-destructive">*</span>
            </Label>
            <Input id="nc-name" placeholder="חברה בע״מ / שם פרטי" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nc-contact">שם איש קשר</Label>
              <Input id="nc-contact" placeholder="ישראל ישראלי" {...register("contactName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-company">ח.פ / ת.ז</Label>
              <Input id="nc-company" dir="ltr" placeholder="515XXXXXXX" {...register("companyNumber")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nc-phone">טלפון ראשי</Label>
              <Input id="nc-phone" type="tel" dir="ltr" placeholder="050-1234567" {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-phone2">טלפון נוסף</Label>
              <Input id="nc-phone2" type="tel" dir="ltr" placeholder="03-1234567" {...register("phone2")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nc-email">דוא״ל</Label>
            <Input
              id="nc-email"
              type="email"
              dir="ltr"
              placeholder="contact@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nc-address">כתובת</Label>
            <Input id="nc-address" placeholder="רחוב הרצל 1, תל אביב" {...register("address")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nc-notes">הערות</Label>
            <Textarea
              id="nc-notes"
              placeholder="מידע נוסף על הלקוח..."
              rows={3}
              {...register("notes")}
            />
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              שמור לקוח
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
