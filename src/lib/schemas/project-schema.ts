import { z } from "zod";
import { PROJECT_STATUS_VALUES } from "@/lib/constants/project-enums";

// ─── Validation message overrides ────────────────────────────────────────────

export type ProjectValidationMessages = {
  nameTooShort?:   string;
  clientRequired?: string;
};

const DEFAULT_MSGS = {
  nameTooShort:   "שם חייב להכיל לפחות 2 תווים",
  clientRequired: "בחר לקוח",
};

// ─── Schema factories ─────────────────────────────────────────────────────────

export function buildCreateProjectSchema(msgs: ProjectValidationMessages = {}) {
  const m = { ...DEFAULT_MSGS, ...msgs };
  return z.object({
    name:          z.string().min(2, m.nameTooShort),
    description:   z.string().optional(),
    address:       z.string().optional(),
    clientId:      z.string().min(1, m.clientRequired),
    status:        z.enum(PROJECT_STATUS_VALUES),
    startDate:     z.string().optional(),
    endDate:       z.string().optional(),
    contractValue: z.string().optional(),
    latitude:      z.number().optional().nullable(),
    longitude:     z.number().optional().nullable(),
  });
}

export function buildUpdateProjectSchema(msgs: ProjectValidationMessages = {}) {
  const m = { ...DEFAULT_MSGS, ...msgs };
  return z.object({
    name:          z.string().min(2, m.nameTooShort),
    description:   z.string().optional(),
    address:       z.string().optional(),
    status:        z.enum(PROJECT_STATUS_VALUES),
    startDate:     z.string().optional(),
    endDate:       z.string().optional(),
    contractValue: z.string().optional(),
    latitude:      z.number().optional().nullable(),
    longitude:     z.number().optional().nullable(),
  });
}

// ─── Default exports (used by server actions — stay Hebrew) ───────────────────

export const createProjectSchema = buildCreateProjectSchema();
export const updateProjectSchema  = buildUpdateProjectSchema();

export type CreateProjectInput = z.infer<ReturnType<typeof buildCreateProjectSchema>>;
export type UpdateProjectInput = z.infer<ReturnType<typeof buildUpdateProjectSchema>>;
