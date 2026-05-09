import { z } from "zod";
import { PROJECT_STATUS_VALUES } from "@/lib/constants/project-enums";

export const createProjectSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  description: z.string().optional(),
  address: z.string().optional(),
  clientId: z.string().min(1, "בחר לקוח"),
  status: z.enum(PROJECT_STATUS_VALUES),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  contractValue: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
