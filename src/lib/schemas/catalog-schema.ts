import { z } from "zod";

export const catalogItemSchema = z.object({
  name:        z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  sku:         z.string().optional(),
  unit:        z.string().min(1, "יחידה חובה"),
  unitCost:    z.string().optional(),
  category:    z.string().optional(),
  description: z.string().optional(),
});

export type CatalogItemInput = z.infer<typeof catalogItemSchema>;
