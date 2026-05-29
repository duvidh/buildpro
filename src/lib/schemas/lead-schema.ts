import { z } from "zod";
import { LEAD_SOURCE_VALUES } from "@/lib/constants/lead-enums";

// ─── Validation message overrides ────────────────────────────────────────────

export type LeadValidationMessages = {
  nameTooShort?: string;
  invalidPhone?: string;
  invalidEmail?: string;
};

const DEFAULT_MSGS = {
  nameTooShort: "שם חייב להכיל לפחות 2 תווים",
  invalidPhone:  "מספר טלפון לא תקין",
  invalidEmail:  "כתובת אימייל לא תקינה",
};

// ─── Schema factory ───────────────────────────────────────────────────────────

export function buildLeadSchema(msgs: LeadValidationMessages = {}) {
  const m = { ...DEFAULT_MSGS, ...msgs };
  return z.object({
    name:               z.string().min(2, m.nameTooShort),
    phone:              z.string().min(9, m.invalidPhone),
    phone2:             z.string().optional(),
    email:              z.string().email(m.invalidEmail).optional().or(z.literal("")),
    propertyAddress:    z.string().optional(),
    city:               z.string().optional(),
    estimatedSize:      z.string().optional(),   // parsed in server action
    constructionTypes:  z.array(z.string()).optional(),
    source:             z.enum(LEAD_SOURCE_VALUES),
    budget:             z.string().optional(),
    notes:              z.string().optional(),
    assignedEmployeeId: z.string().optional(),
  });
}

// ─── Default export (used by server actions — stays Hebrew) ───────────────────

export const createLeadSchema = buildLeadSchema();
export type CreateLeadInput = z.infer<ReturnType<typeof buildLeadSchema>>;
