"use client";

import { Direction } from "radix-ui";

/**
 * Client wrapper around Radix's DirectionProvider. Radix's provider uses
 * React.createContext, which can't run in a Server Component, so it must live
 * behind a "use client" boundary before being used in the root layout.
 */
export function DirectionProvider({
  dir,
  children,
}: {
  dir: "rtl" | "ltr";
  children: React.ReactNode;
}) {
  return <Direction.DirectionProvider dir={dir}>{children}</Direction.DirectionProvider>;
}
