export const APP_CONFIG = {
  companyName: "BuildPro",
  companyTagline: "ניהול קבלנות",
} as const;

// Placeholder until auth is wired up — replace with session user lookup
export const MOCK_CURRENT_USER = {
  name: "מנהל מערכת",
  initials: "מ",
  email: "admin@buildpro.co.il",
} as const;
