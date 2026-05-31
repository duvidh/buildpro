import { z } from "zod";

// ─── Validation message overrides ────────────────────────────────────────────

export type ClientValidationMessages = {
  nameTooShort?: string;
  invalidEmail?: string;
};

const DEFAULT_MSGS = {
  nameTooShort: "שם חייב להכיל לפחות 2 תווים",
  invalidEmail: "כתובת אימייל לא תקינה",
};

// ─── Schema factory ───────────────────────────────────────────────────────────

export function buildClientSchema(msgs: ClientValidationMessages = {}) {
  const m = { ...DEFAULT_MSGS, ...msgs };
  return z.object({
    name:          z.string().min(2, m.nameTooShort),
    contactName:   z.string().optional(),
    phone:         z.string().optional(),
    phone2:        z.string().optional(),
    email:         z.string().email(m.invalidEmail).optional().or(z.literal("")),
    address:       z.string().optional(),
    companyNumber: z.string().optional(),
    notes:         z.string().optional(),
    latitude:      z.number().optional().nullable(),
    longitude:     z.number().optional().nullable(),
  });
}

// ─── Default export (used by server actions — stays Hebrew) ───────────────────

export const clientSchema = buildClientSchema();
export type ClientInput = z.infer<ReturnType<typeof buildClientSchema>>;
