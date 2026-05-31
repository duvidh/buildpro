"use client";

import Link from "next/link";
import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MobileTabItem = {
  id:      string;
  label:   string;
  icon:    React.ElementType;
  count?:  number | null;
  active:  boolean;
  /** Link mode — navigates via <Link>. */
  href?:     string;
  /** Button mode — runs a callback (e.g. router.push with search params). */
  onSelect?: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────
// Mobile-only replacement for a horizontally-scrolling tab row: a single
// full-width button showing the active tab, opening a vertical dropdown of all
// tabs. Render this with `md:hidden` alongside the desktop `<nav>` (`hidden md:flex`).

export function MobileTabSelect({
  items,
  ariaLabel,
}: {
  items: MobileTabItem[];
  ariaLabel?: string;
}) {
  const active = items.find((i) => i.active) ?? items[0];
  if (!active) return null;
  const ActiveIcon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground"
        >
          <ActiveIcon className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{active.label}</span>
          {active.count != null && active.count > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
              {active.count}
            </span>
          )}
          <ChevronDown className="ms-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[60vh]">
        {items.map((item) => {
          const Icon = item.icon;
          const inner = (
            <>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.count != null && item.count > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                  {item.count}
                </span>
              )}
              {item.active && <Check className="ms-auto h-4 w-4 shrink-0 text-primary" />}
            </>
          );
          const cls = cn(
            "gap-2 py-2 cursor-pointer",
            item.active && "text-primary font-medium",
          );

          return item.href ? (
            <DropdownMenuItem key={item.id} asChild className={cls}>
              <Link href={item.href}>{inner}</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={item.id} onSelect={item.onSelect} className={cls}>
              {inner}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
