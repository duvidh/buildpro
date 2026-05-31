import { z } from "zod";
import { QUOTE_STATUS_VALUES } from "@/lib/constants/quote-enums";

export type QuoteValidationMessages = {
  selectClientOrLead?: string;
};

const DEFAULT_MSGS = {
  selectClientOrLead: "בחר לקוח או ליד",
};

export function buildCreateQuoteSchema(msgs: QuoteValidationMessages = {}) {
  const m = { ...DEFAULT_MSGS, ...msgs };
  return z
    .object({
      clientId:  z.string().min(1).optional(),
      leadId:    z.string().min(1).optional(),
      projectId: z.string().optional(),
    })
    .refine((d) => d.clientId || d.leadId, {
      message: m.selectClientOrLead,
      path: ["clientId"],
    });
}

export const createQuoteSchema = buildCreateQuoteSchema();
export type CreateQuoteInput = z.infer<ReturnType<typeof buildCreateQuoteSchema>>;

export const updateQuoteHeaderSchema = z.object({
  clientId:   z.string().min(1).optional(),
  date:       z.string().optional(),
  validUntil: z.string().optional(),
  status:     z.enum(QUOTE_STATUS_VALUES).optional(),
  notes:      z.string().optional(),
});
export type UpdateQuoteHeaderInput = z.infer<typeof updateQuoteHeaderSchema>;
