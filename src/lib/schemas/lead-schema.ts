import { z } from "zod";
import {
  LEAD_SOURCE_VALUES,
  LEAD_URGENCY_VALUES,
} from "@/lib/constants/lead-enums";

export const createLeadSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  phone: z.string().min(9, "מספר טלפון לא תקין"),
  phone2: z.string().optional(),
  email: z.string().email("כתובת אימייל לא תקינה").optional().or(z.literal("")),
  propertyAddress: z.string().optional(),
  source: z.enum(LEAD_SOURCE_VALUES),
  urgency: z.enum(LEAD_URGENCY_VALUES),
  budget: z.string().optional(),
  notes: z.string().optional(),
  assignedEmployeeId: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
