import { z } from "zod";

export const createMilestoneSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  date: z.string().min(1, "תאריך חובה"),
  weight: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
