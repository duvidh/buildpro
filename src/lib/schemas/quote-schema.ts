import { z } from "zod";
import { QUOTE_STATUS_VALUES } from "@/lib/constants/quote-enums";

export const createQuoteSchema = z.object({
  clientId: z.string().min(1, "בחר לקוח"),
  projectId: z.string().optional(),
});
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

export const updateQuoteHeaderSchema = z.object({
  clientId: z.string().min(1).optional(),
  date: z.string().optional(),
  validUntil: z.string().optional(),
  status: z.enum(QUOTE_STATUS_VALUES).optional(),
  notes: z.string().optional(),
});
export type UpdateQuoteHeaderInput = z.infer<typeof updateQuoteHeaderSchema>;
