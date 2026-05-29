import type { PrefabStatus } from "@/generated/prisma/client";

export const PREFAB_STATUSES: PrefabStatus[] = [
  "PLANNED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "READY_FOR_DISPATCH",
  "SHIPPED",
  "DELIVERED",
  "INSTALLED",
];
