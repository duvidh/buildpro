"use server";

import { cookies } from "next/headers";
import { type Locale, locales, defaultLocale } from "@/i18n/request";

/**
 * Sets the NEXT_LOCALE cookie and signals the client to reload.
 * Expires in 1 year.
 */
export async function setLocale(locale: string): Promise<void> {
  const safe: Locale =
    (locales as readonly string[]).includes(locale)
      ? (locale as Locale)
      : defaultLocale;

  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", safe, {
    maxAge: 60 * 60 * 24 * 365,
    path:   "/",
    sameSite: "lax",
  });
}
