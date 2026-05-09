"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateQuoteHeader } from "@/actions/quotes";
import {
  updateQuoteHeaderSchema,
  type UpdateQuoteHeaderInput,
} from "@/lib/schemas/quote-schema";
import { QUOTE_STATUS_VALUES } from "@/lib/constants/quote-enums";

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = { id: string; name: string };

type Props = {
  quoteId: string;
  initialValues: {
    clientId: string;
    date: string;
    validUntil?: string | null;
    status: string;
    notes?: string | null;
  };
  clients: Client[];
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "טיוטה",
  SENT: "נשלחה",
  ACCEPTED: "אושרה",
  REJECTED: "נדחתה",
  EXPIRED: "פגת תוקף",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function QuoteHeaderForm({ quoteId, initialValues, clients }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, watch, setValue, getValues } = useForm<UpdateQuoteHeaderInput>({
    resolver: zodResolver(updateQuoteHeaderSchema),
    defaultValues: {
      clientId: initialValues.clientId,
      date: initialValues.date,
      validUntil: initialValues.validUntil ?? "",
      status: initialValues.status as UpdateQuoteHeaderInput["status"],
      notes: initialValues.notes ?? "",
    },
  });

  const autoSave = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const data = getValues();
      await updateQuoteHeader(quoteId, data);
    }, 800);
  };

  useEffect(() => {
    const sub = watch(() => autoSave());
    return () => sub.unsubscribe();
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Client */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="clientId">לקוח</Label>
        <Select
          defaultValue={initialValues.clientId}
          onValueChange={(val) => {
            setValue("clientId", val);
            autoSave();
          }}
        >
          <SelectTrigger id="clientId">
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
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date">תאריך הצעה</Label>
        <Input
          id="date"
          type="date"
          {...register("date")}
          onBlur={autoSave}
        />
      </div>

      {/* Valid Until */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="validUntil">בתוקף עד</Label>
        <Input
          id="validUntil"
          type="date"
          {...register("validUntil")}
          onBlur={autoSave}
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">סטטוס</Label>
        <Select
          defaultValue={initialValues.status}
          onValueChange={(val) => {
            setValue("status", val as UpdateQuoteHeaderInput["status"]);
            autoSave();
          }}
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUOTE_STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="notes">הערות</Label>
        <Textarea
          id="notes"
          rows={2}
          placeholder="הערות להצעה..."
          {...register("notes")}
          onBlur={autoSave}
        />
      </div>
    </div>
  );
}
