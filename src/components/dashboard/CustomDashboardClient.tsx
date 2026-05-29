"use client";

import { useState, useTransition, useCallback } from "react";
import GridLayout, { WidthProvider, type Layout } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import {
  Settings2, Check, Plus, X, GripVertical, Loader2,
  LayoutGrid, RefreshCcw, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveDashboardLayout } from "@/actions/users";
import { DashboardActions } from "./dashboard-actions";

import {
  WIDGET_DEFS, DEFAULT_LAYOUT, LAYOUT_VERSION,
  KpiWidget, LeadsWidget, TasksWidget,
  FinanceWidget, ProjectsWidget, PaymentsWidget,
  ClockWidget, MilestonesWidget, InvoicesDueWidget,
  ActivityWidget, QuickActionsWidget,
} from "./widgets";
import type { DashboardData, WidgetLayoutItem } from "./widgets";

// ─── Layout version helpers ───────────────────────────────────────────────────

/** Sentinel item stored in DB to track which version the layout was saved with */
const VERSION_SENTINEL_ID = `__layout_v${LAYOUT_VERSION}__`;

/** Strip sentinel items out before rendering */
function stripSentinels(items: WidgetLayoutItem[]): WidgetLayoutItem[] {
  return items.filter((i) => !i.i.startsWith("__layout_v"));
}

/** Return true only if the saved layout carries the current version marker */
function isCurrentVersion(items: WidgetLayoutItem[] | null): boolean {
  return !!items?.some((i) => i.i === VERSION_SENTINEL_ID);
}

// ─── Auto-width grid ──────────────────────────────────────────────────────────

const AutoGrid = WidthProvider(GridLayout);
const COLS = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate() {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date());
}

/** Find the best x,y position to drop a new widget without overlapping */
function findFreePosition(
  layout: WidgetLayoutItem[],
  w: number,
  h: number,
): { x: number; y: number } {
  if (layout.length === 0) return { x: 0, y: 0 };

  const maxY = Math.max(...layout.map((item) => item.y + item.h));

  for (let row = 0; row <= maxY; row++) {
    for (let col = 0; col <= COLS - w; col++) {
      const overlaps = layout.some((item) => {
        const xOverlap = col < item.x + item.w && col + w > item.x;
        const yOverlap = row < item.y + item.h && row + h > item.y;
        return xOverlap && yOverlap;
      });
      if (!overlaps) return { x: col, y: row };
    }
  }

  // No gap — append below
  return { x: 0, y: maxY };
}

// ─── Widget content dispatcher ────────────────────────────────────────────────

function WidgetContent({ id, data }: { id: string; data: DashboardData }) {
  switch (id) {
    case "kpis":          return <KpiWidget data={data} />;
    case "finance":       return <FinanceWidget data={data} />;
    case "leads":         return <LeadsWidget data={data} />;
    case "tasks":         return <TasksWidget data={data} />;
    case "projects":      return <ProjectsWidget data={data} />;
    case "payments":      return <PaymentsWidget data={data} />;
    case "clock":         return <ClockWidget />;
    case "milestones":    return <MilestonesWidget data={data} />;
    case "invoices_due":  return <InvoicesDueWidget data={data} />;
    case "activity":      return <ActivityWidget data={data} />;
    case "quick_actions": return <QuickActionsWidget />;
    default: return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        ווידג׳ט לא מזוהה
      </div>
    );
  }
}

// ─── Accent gradient strip ────────────────────────────────────────────────────

function AccentStrip({ gradient }: { gradient: string }) {
  return (
    <div className={`absolute top-0 inset-x-0 h-[3px] rounded-t-2xl bg-gradient-to-r ${gradient}`} />
  );
}

// ─── Widget shell ─────────────────────────────────────────────────────────────

function WidgetShell({
  id, editMode, onRemove, children,
}: {
  id: string;
  editMode: boolean;
  onRemove: (id: string) => void;
  children: React.ReactNode;
}) {
  const def = WIDGET_DEFS[id];

  return (
    <div
      className={cn(
        "relative h-full flex flex-col overflow-hidden",
        "rounded-2xl border border-border/60",
        "bg-card/95 backdrop-blur-sm",
        "shadow-[0_2px_16px_rgb(0,0,0,0.06)]",
        "transition-shadow duration-200",
        editMode
          ? "ring-2 ring-primary/30 ring-offset-0 shadow-[0_4px_20px_rgb(0,0,0,0.12)] cursor-default"
          : "hover:shadow-[0_4px_20px_rgb(0,0,0,0.09)]",
      )}
    >
      {/* Coloured top accent */}
      {def && <AccentStrip gradient={def.accentColor} />}

      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2.5 shrink-0 select-none",
          "border-b border-border/30 mt-[3px]",
          editMode
            ? "widget-drag-handle cursor-grab active:cursor-grabbing bg-muted/20 hover:bg-muted/40 transition-colors"
            : "bg-transparent",
        )}
      >
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />}
          {def && (
            <span className="text-xs font-semibold text-foreground/70 tracking-wide uppercase leading-none">
              {def.label}
            </span>
          )}
        </div>
        {editMode && (
          <button
            type="button"
            onClick={() => onRemove(id)}
            className="h-5 w-5 rounded-md flex items-center justify-center text-muted-foreground/50
              hover:text-destructive hover:bg-destructive/10 transition-all duration-150"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ─── Widget gallery modal ─────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  finance:  "💰 פיננסים",
  projects: "🏗️ פרויקטים",
  crm:      "🤝 CRM",
  tools:    "🛠️ כלים",
};

function WidgetGallery({
  currentIds,
  onAdd,
  onClose,
}: {
  currentIds: string[];
  onAdd: (id: string) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<string>("all");

  const categories = ["all", "finance", "projects", "crm", "tools"] as const;
  const available  = Object.entries(WIDGET_DEFS).filter(([id]) => !currentIds.includes(id));
  const filtered   = filter === "all"
    ? available
    : available.filter(([, def]) => def.category === filter);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        dir="rtl"
        className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl border-t border-border
          bg-background/95 backdrop-blur-md shadow-[0_-8px_40px_rgb(0,0,0,0.15)]
          flex flex-col max-h-[70vh]
          md:inset-x-auto md:right-4 md:bottom-4 md:left-auto md:rounded-2xl md:border
          md:w-[480px] md:max-h-[calc(100vh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">גלריית ווידג׳טים</h3>
            {available.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5">{available.length} זמינים</Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center
              text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-border/30 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all",
                filter === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted",
              )}
            >
              {cat === "all" ? "✨ הכל" : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Widget grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <Check className="h-8 w-8 text-emerald-400/60" />
              <p className="text-sm text-muted-foreground">
                כל הווידג׳טים בקטגוריה זו כבר מוצגים בדשבורד
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(([id, def]) => {
                const Icon = def.icon;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { onAdd(id); onClose(); }}
                    className="relative flex flex-col items-start gap-2 rounded-xl border border-border/60
                      bg-card hover:bg-muted/40 hover:border-primary/40
                      p-3.5 text-start transition-all duration-200 hover:shadow-sm group"
                  >
                    {/* Accent top strip */}
                    <div className={`absolute top-0 inset-x-0 h-[2px] rounded-t-xl bg-gradient-to-r ${def.accentColor}`} />

                    <div className="flex items-center gap-2 w-full">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg
                        bg-gradient-to-br ${def.accentColor} bg-opacity-10`}
                      >
                        <Icon className="h-4 w-4 text-white drop-shadow-sm" />
                      </div>
                      <span className="text-sm font-semibold text-foreground leading-tight flex-1">
                        {def.label}
                      </span>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary
                        group-hover:opacity-100 opacity-0 transition-all" />
                    </div>

                    <p className="text-xs text-muted-foreground leading-snug">
                      {def.description}
                    </p>

                    <span className="text-[10px] text-muted-foreground/50">
                      {def.defaultSize.w}×{def.defaultSize.h} עמודות
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function CustomDashboardClient({
  dashboardData,
  savedLayout,
  userName,
}: {
  dashboardData: DashboardData;
  savedLayout: WidgetLayoutItem[] | null;
  userName: string;
}) {
  const [editMode,      setEditMode]      = useState(false);
  const [showGallery,   setShowGallery]   = useState(false);
  // Use saved layout only if it carries the current version marker;
  // otherwise fall back to DEFAULT_LAYOUT so stale/compressed layouts auto-reset.
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(
    isCurrentVersion(savedLayout) ? stripSentinels(savedLayout!) : DEFAULT_LAYOUT,
  );
  const [isSaving, startSaving] = useTransition();

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 5  ? "לילה טוב" :
    hour < 12 ? "בוקר טוב" :
    hour < 17 ? "צהריים טובים" :
    hour < 21 ? "ערב טוב" :
                "לילה טוב";

  const handleLayoutChange = useCallback((newLayout: Layout) => {
    setLayout((prev) =>
      newLayout.map((item) => {
        const existing = prev.find((p) => p.i === item.i);
        return { ...item, minW: existing?.minW, minH: existing?.minH };
      }),
    );
  }, []);

  function removeWidget(id: string) {
    setLayout((prev) => prev.filter((item) => item.i !== id));
  }

  function addWidget(id: string) {
    const def = WIDGET_DEFS[id];
    if (!def) return;
    const { w, h } = def.defaultSize;
    const pos = findFreePosition(layout, w, h);
    setLayout((prev) => [
      ...prev,
      { i: id, ...pos, ...def.defaultSize },
    ]);
    toast.success(`${def.label} נוסף לדשבורד`);
  }

  function resetLayout() {
    setLayout(DEFAULT_LAYOUT);
    // Persist the reset immediately so the DB version is up-to-date
    startSaving(async () => {
      await saveDashboardLayout([
        ...DEFAULT_LAYOUT,
        { i: VERSION_SENTINEL_ID, x: 0, y: 9999, w: 1, h: 1 },
      ]);
    });
    toast.success("הדשבורד אופס לברירת המחדל");
  }

  function handleToggleEdit() {
    if (editMode) {
      // Attach the version sentinel before saving so future loads can verify compatibility
      const layoutWithVersion: WidgetLayoutItem[] = [
        ...layout,
        { i: VERSION_SENTINEL_ID, x: 0, y: 9999, w: 1, h: 1 },
      ];
      startSaving(async () => {
        const res = await saveDashboardLayout(layoutWithVersion);
        if (res.success) toast.success("הדשבורד נשמר בהצלחה ✓");
        else             toast.error("שגיאה בשמירת הדשבורד");
      });
      setShowGallery(false);
    }
    setEditMode((v) => !v);
  }

  // renderableLayout excludes version-sentinel items (never rendered as widgets)
  const renderableLayout = layout.filter((l) => !l.i.startsWith("__layout_v"));
  const currentIds = renderableLayout.map((l) => l.i);
  const hasAvailable = Object.keys(WIDGET_DEFS).some((id) => !currentIds.includes(id));

  return (
    <div className="space-y-4">

      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {editMode ? (
            <>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                עריכת דשבורד
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                גרור ווידג׳טים למיקום חדש · שנה גודל מהפינה · לחץ ✕ למחיקה
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">
                <span className="text-muted-foreground font-normal">{greeting}, </span>
                <span className="bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">
                  {userName}
                </span>
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">{fmtDate()}</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!editMode && <DashboardActions />}

          {editMode ? (
            <>
              {hasAvailable && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setShowGallery((v) => !v)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  הוסף ווידג׳ט
                  <ChevronDown className={cn("h-3 w-3 transition-transform", showGallery && "rotate-180")} />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 text-xs text-muted-foreground"
                onClick={resetLayout}
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                איפוס
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-gradient-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                onClick={handleToggleEdit}
                disabled={isSaving}
              >
                {isSaving
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Check className="h-3.5 w-3.5" />}
                שמור דשבורד
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleToggleEdit}
            >
              <Settings2 className="h-3.5 w-3.5" />
              ערוך
            </Button>
          )}
        </div>
      </div>

      {/* ── Edit hint banner ── */}
      {editMode && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Settings2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-xs text-primary/80">
            <strong>מצב עריכה פעיל</strong> — גרור ע״י אחיזת הכותרת · שנה גודל מפינה ימין-תחתון · הנח ווידג׳טים בחופשיות זה לצד זה
          </p>
        </div>
      )}

      {/* ── Grid ── */}
      {/*
        dir="ltr" is intentional: react-grid-layout always treats x=0 as the
        physical LEFT edge.  Without this override the RTL context on <html>
        causes the grid's coordinate system to be mirrored, so widgets cluster
        to the right and dragging only reaches the centre of the container.
      */}
      <div
        dir="ltr"
        className={cn(
          "relative transition-all duration-300",
          editMode && "rounded-2xl bg-muted/20 border-2 border-dashed border-border/60 p-2 -m-2",
        )}
      >
        <AutoGrid
          layout={renderableLayout}
          cols={COLS}
          rowHeight={80}
          margin={[12, 12]}
          containerPadding={[0, 0]}
          isDraggable={editMode}
          isResizable={editMode}
          draggableHandle=".widget-drag-handle"
          onLayoutChange={handleLayoutChange}
          compactType={null}
          preventCollision={true}
          className="!overflow-visible"
          resizeHandles={["se"]}
          useCSSTransforms
        >
          {renderableLayout.map((item) => (
            <div key={item.i}>
              <WidgetShell id={item.i} editMode={editMode} onRemove={removeWidget}>
                <WidgetContent id={item.i} data={dashboardData} />
              </WidgetShell>
            </div>
          ))}
        </AutoGrid>
      </div>

      {/* ── Widget gallery (floating panel) ── */}
      {editMode && showGallery && (
        <WidgetGallery
          currentIds={currentIds}
          onAdd={addWidget}
          onClose={() => setShowGallery(false)}
        />
      )}
    </div>
  );
}
