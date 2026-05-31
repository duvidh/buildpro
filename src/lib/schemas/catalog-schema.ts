import { z } from "zod";

export type CatalogValidationMessages = {
  nameRequired?: string;
  unitRequired?: string;
};

const DEFAULT_MSGS = {
  nameRequired: "שם חייב להכיל לפחות 2 תווים",
  unitRequired: "יחידה חובה",
};

export function buildCatalogItemSchema(msgs: CatalogValidationMessages = {}) {
  const m = { ...DEFAULT_MSGS, ...msgs };
  return z.object({
    name:        z.string().min(2, m.nameRequired),
    sku:         z.string().optional(),
    unit:        z.string().min(1, m.unitRequired),
    unitCost:    z.string().optional(),
    category:    z.string().optional(),
    description: z.string().optional(),
  });
}

export const catalogItemSchema = buildCatalogItemSchema();
export type CatalogItemInput = z.infer<ReturnType<typeof buildCatalogItemSchema>>;
