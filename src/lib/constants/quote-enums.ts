export const QUOTE_STATUS_VALUES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const;
export type QuoteStatusValue = (typeof QUOTE_STATUS_VALUES)[number];
