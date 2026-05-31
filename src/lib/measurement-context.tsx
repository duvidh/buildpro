"use client";

import { createContext, useContext, useMemo } from "react";
import { useLocale } from "next-intl";
import {
  getMeasurementUnits,
  type MeasurementSystem,
  type MeasurementUnits,
} from "@/lib/formatters";

// ─── Context ──────────────────────────────────────────────────────────────────

interface MeasurementContextValue {
  /** The resolved system (after AUTO logic is applied). */
  system: "METRIC" | "IMPERIAL";
  /** Short unit labels ready for use in the UI. */
  units: MeasurementUnits;
  /** Shortcut: units.area  — e.g. "m²" / "sq ft" */
  areaUnit: string;
  /** Shortcut: units.length — e.g. "m" / "ft" */
  lengthUnit: string;
}

const MeasurementContext = createContext<MeasurementContextValue>({
  system: "METRIC",
  units:  { area: "m²", length: "m" },
  areaUnit:   "m²",
  lengthUnit: "m",
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function MeasurementProvider({
  measurementSystem,
  children,
}: {
  measurementSystem: MeasurementSystem | string | null | undefined;
  children: React.ReactNode;
}) {
  const locale = useLocale();

  const value = useMemo<MeasurementContextValue>(() => {
    const units = getMeasurementUnits(measurementSystem, locale);
    const system: "METRIC" | "IMPERIAL" =
      measurementSystem === "METRIC"   ? "METRIC"
      : measurementSystem === "IMPERIAL" ? "IMPERIAL"
      : locale === "en"                  ? "IMPERIAL"
      : "METRIC";
    return {
      system,
      units,
      areaUnit:   units.area,
      lengthUnit: units.length,
    };
  }, [measurementSystem, locale]);

  return (
    <MeasurementContext.Provider value={value}>
      {children}
    </MeasurementContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMeasurement(): MeasurementContextValue {
  return useContext(MeasurementContext);
}
