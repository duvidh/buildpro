"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
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
    clientId:   string;
    date:       string;
    validUntil?: string | null;
    status:     string;
    notes?:     string | null;
  };
  clients:    Client[];
  leadName?:  string | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function QuoteHeaderForm({ quoteId, initialValues, clients, leadName }: Props) {
  const t = useTranslations("quotes");

  const tStatus = (s: string) => {
    try { return t(`status.${s}` as Parameters<typeof t>[0]); } catch { return s; }
  };

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLeadQuote = !initialValues.clientId && !!leadName;

  const { register, watch, setValue, getValues } = useForm<UpdateQuoteHeaderInput>({
    resolver: zodResolver(updateQuoteHeaderSchema),
    defaultValues: {
      clientId:   initialValues.clientId,
      date:       initialValues.date,
      validUntil: initialValues.validUntil ?? "",
      status:     initialValues.status as UpdateQuoteHeaderInput["status"],
      notes:      initialValues.notes ?? "",
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
    // eslint-disable-next-line react-hooks/incompatible-library
    const sub = watch(() => autoSave());
    return () => sub.unsubscribe();
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Client or Lead */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="clientId">{t("header.client")}</Label>
        {isLeadQuote ? (
          <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted/40">
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 shrink-0">
              {t("lead")}
            </Badge>
            <span className="text-sm text-muted-foreground truncate">{leadName}</span>
          </div>
        ) : (
          <Select
            defaultValue={initialValues.clientId}
            onValueChange={(val) => {
              setValue("clientId", val);
              autoSave();
            }}
          >
            <SelectTrigger id="clientId">
              <SelectValue placeholder={t("header.selectClient")} />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date">{t("header.date")}</Label>
        <Input
          id="date"
          type="date"
          {...register("date")}
          onBlur={autoSave}
        />
      </div>

      {/* Valid Until */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="validUntil">{t("header.validUntil")}</Label>
        <Input
          id="validUntil"
          type="date"
          {...register("validUntil")}
          onBlur={autoSave}
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">{t("header.status")}</Label>
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
                {tStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="notes">{t("header.notes")}</Label>
        <Textarea
          id="notes"
          rows={2}
          placeholder={t("header.notesPlaceholder")}
          {...register("notes")}
          onBlur={autoSave}
        />
      </div>
    </div>
  );
}
