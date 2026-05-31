"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";

export function ClockWidget() {
  const t = useTranslations("widgets.clock");
  const locale = useLocale();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
        <div className="h-12 w-32 rounded-lg bg-muted/50 animate-pulse" />
        <div className="h-4 w-24 rounded bg-muted/40 animate-pulse" />
      </div>
    );
  }

  const hh  = String(now.getHours()).padStart(2, "0");
  const mm  = String(now.getMinutes()).padStart(2, "0");
  const ss  = String(now.getSeconds()).padStart(2, "0");

  const intlLocale = locale === "he" ? "he-IL" : "en-US";
  const dayName = new Intl.DateTimeFormat(intlLocale, { weekday: "long" }).format(now);
  const dateStr = new Intl.DateTimeFormat(intlLocale, {
    day: "numeric", month: "long", year: "numeric",
  }).format(now);

  // Progress of day: 0–100
  const dayPct = Math.round(
    ((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400) * 100
  );

  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (dayPct / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-4 select-none">
      {/* Ring progress */}
      <div className="relative flex items-center justify-center">
        <svg width="110" height="110" viewBox="0 0 96 96" className="-rotate-90">
          <circle
            cx="48" cy="48" r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-muted/30"
          />
          <circle
            cx="48" cy="48" r="42"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-primary transition-all duration-1000"
            stroke="currentColor"
          />
        </svg>
        {/* Time inside ring */}
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground leading-none">
            {hh}:{mm}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground mt-0.5">{ss}</span>
        </div>
      </div>

      {/* Date row */}
      <div className="text-center space-y-0.5">
        <p className="text-sm font-semibold text-foreground">{t("dayPrefix")} {dayName}</p>
        <p className="text-xs text-muted-foreground">{dateStr}</p>
        <p className="text-[11px] text-muted-foreground/60">{t("dayProgress", { pct: dayPct })}</p>
      </div>
    </div>
  );
}
