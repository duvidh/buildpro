export const PROJECT_STATUS_VALUES = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ProjectStatusValue = (typeof PROJECT_STATUS_VALUES)[number];
