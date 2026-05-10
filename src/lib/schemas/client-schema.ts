import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  email: z.string().email("כתובת אימייל לא תקינה").optional().or(z.literal("")),
  address: z.string().optional(),
  companyNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;
