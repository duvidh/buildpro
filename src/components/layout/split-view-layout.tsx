"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, X, PanelBottomOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SplitViewLayoutProps {
  /** Always-visible master list panel */
  master: React.ReactNode;
  /** Detail panel — null hides it and master takes full height */
  detail: React.ReactNode | null;
  /** Label shown in the detail header bar */
  detailTitle?: string;
  /** Called when the user clicks "close" / "back to list" */
  onClose: () => void;
  /** Height of master when detail is open (desktop only, default: 260px) */
  masterMaxHeight?: string;
}

/**
 * Master-Detail split-view layout.
 *
 * Mobile (<md):
 *   - Detail open  → full-screen overlay with "Back to list" top bar; master hidden.
 *   - Detail closed → master fills available space.
 *
 * Desktop (md+):
 *   - Without detail: master fills all available space.
 *   - With detail:    master collapses to `masterMaxHeight` then detail slides up.
 */
export function SplitViewLayout({
  master,
  detail,
  detailTitle,
  onClose,
  masterMaxHeight = "260px",
}: SplitViewLayoutProps) {
  const t = useTranslations("common");
  const isOpen = detail !== null;

  return (
    <>
      {/* ── Mobile: full-screen detail overlay ────────────────────────────────── */}
      {isOpen && (
        <div
          className={cn(
            "md:hidden fixed inset-0 z-40 flex flex-col bg-background",
            "animate-in slide-in-from-bottom-4 fade-in-0 duration-300 ease-out",
          )}
        >
          {/* Mobile back bar */}
          <div className="flex items-center gap-2 h-14 px-4 border-b border-border bg-background/80 glass-header shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-sm text-muted-foreground hover:text-foreground -ms-2"
              onClick={onClose}
            >
              <ArrowRight className="h-4 w-4" />
              {t("backToList")}
            </Button>
            {detailTitle && (
              <span className="text-sm font-semibold text-foreground truncate flex-1 text-start">
                {detailTitle}
              </span>
            )}
          </div>

          {/* Scrollable detail content */}
          <div className="flex-1 overflow-y-auto p-4">
            {detail}
          </div>
        </div>
      )}

      {/* ── Desktop layout ──────────────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-col min-h-0 w-full">
        {/* Master panel */}
        <div
          className={cn(
            "transition-[max-height,opacity] duration-300 ease-in-out",
            isOpen ? "overflow-y-auto" : "overflow-visible",
          )}
          style={isOpen ? { maxHeight: masterMaxHeight } : undefined}
        >
          {master}
        </div>

        {/* Detail panel */}
        {isOpen && (
          <div
            className={cn(
              "flex flex-col min-h-0 mt-0",
              "border-t-2 border-primary/20",
              "shadow-[0_-4px_20px_rgb(0,0,0,0.06)]",
              "animate-in slide-in-from-bottom-3 fade-in-0 duration-300 ease-out",
            )}
          >
            {/* Sticky detail header */}
            <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2">
                <PanelBottomOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs font-semibold text-foreground">
                  {detailTitle ?? t("details")}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={onClose}
              >
                <X className="h-3 w-3" />
                {t("closePanel")}
              </Button>
            </div>

            {/* Scrollable detail content */}
            <div className="overflow-y-auto">
              {detail}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile master (only when detail is closed) ─────────────────────────── */}
      <div className={cn("md:hidden", isOpen && "hidden")}>
        {master}
      </div>
    </>
  );
}
