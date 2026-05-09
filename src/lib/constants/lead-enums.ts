export const LEAD_STATUS_VALUES = [
  "NEW",
  "CONTACTED",
  "MEETING_SCHEDULED",
  "QUOTE_SENT",
  "NEGOTIATION",
  "CONVERTED",
  "LOST",
] as const;
export type LeadStatusValue = (typeof LEAD_STATUS_VALUES)[number];

export const LEAD_SOURCE_VALUES = [
  "REFERRAL",
  "WEBSITE",
  "PHONE",
  "SOCIAL_MEDIA",
  "WALK_IN",
  "OTHER",
] as const;
export type LeadSourceValue = (typeof LEAD_SOURCE_VALUES)[number];

export const LEAD_URGENCY_VALUES = ["LOW", "MEDIUM", "HIGH"] as const;
export type LeadUrgencyValue = (typeof LEAD_URGENCY_VALUES)[number];
