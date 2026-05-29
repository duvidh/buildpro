"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { setLocale } from "@/actions/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ─── Locale definitions ───────────────────────────────────────────────────────

const LOCALES = [
  { code: "he", flag: "🇮🇱", label: "עברית",  short: "HE" },
  { code: "en", flag: "🇺🇸", label: "English", short: "EN" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function LanguageSwitcher() {
  const locale               = useLocale();
  const [isPending, startTx] = useTransition();

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  function handleSwitch(code: string) {
    if (code === locale) return;
    startTx(async () => {
      await setLocale(code);
      // Full navigation so <html lang/dir> updates from the server layout
      window.location.href = window.location.pathname;
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1.5 px-2 text-sm font-medium text-muted-foreground hover:text-foreground",
            isPending && "opacity-60 cursor-wait",
          )}
          aria-label="Change language"
          disabled={isPending}
        >
          <span className="text-base leading-none" aria-hidden>
            {current.flag}
          </span>
          <span className="hidden sm:inline text-xs font-semibold tracking-wide">
            {current.short}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-36 min-w-0">
        {LOCALES.map(({ code, flag, label }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleSwitch(code)}
            className={cn(
              "gap-2.5 cursor-pointer",
              code === locale && "bg-accent font-semibold",
            )}
          >
            <span className="text-base leading-none" aria-hidden>
              {flag}
            </span>
            <span className="text-sm">{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
