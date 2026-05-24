import { z } from "zod";
import { LEAD_SOURCE_VALUES } from "@/lib/constants/lead-enums";

export const createLeadSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  phone: z.string().min(9, "מספר טלפון לא תקין"),
  phone2: z.string().optional(),
  email: z.string().email("כתובת אימייל לא תקינה").optional().or(z.literal("")),
  propertyAddress: z.string().optional(),
  city: z.string().optional(),
  estimatedSize: z.string().optional(),         // stored as string from input, parsed in action
  constructionTypes: z.array(z.string()).optional(),
  source: z.enum(LEAD_SOURCE_VALUES),
  budget: z.string().optional(),
  notes: z.string().optional(),
  assignedEmployeeId: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
