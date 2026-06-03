"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useCurrency } from "@/lib/currency-context";
import { toast } from "sonner";
import {
  Trash2, Plus, Save, Check, Loader2, Eye, PencilLine,
  ChevronDown, ChevronRight, FolderPlus, Pencil, X, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  addQuoteItem,
  deleteQuoteItem,
  saveQuoteItems,
  createQuoteCategory,
  updateQuoteCategory,
  deleteQuoteCategory,
} from "@/actions/quotes";

// ─── Types ────────────────────────────────────────────────────────────────────

type CatalogItem = {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
  category: string | null;
};

type DbCategory = {
  id: string;
  name: string;
  order: number;
};

type DbItem = {
  id: string;
  categoryId: string | null;
  catalogItemId: string | null;
  name: string;
  unit: string;
  dim1: number | null;
  dim2: number | null;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  profitPercent: number;
  linePrice: number;
  order: number;
  catalogItem: { id: string; name: string; unit: string; unitCost: number } | null;
};

type Category = {
  id: string;
  name: string;
  order: number;
  _editing: boolean;
  _pendingName: string;
};

type LineItem = {
  id: string;
  categoryId: string | null;
  catalogItemId: string | null;
  name: string;
  unit: string;
  dim1: number;
  dim2: number | null;
  costPrice: number;   // base cost (internal)
  unitPrice: number;   // selling price
  profitPercent: number;
  quantity: number;
  linePrice: number;
  order: number;
};

type ViewMode = "internal" | "client";

type Props = {
  quoteId: string;
  initialItems: DbItem[];
  initialCategories: DbCategory[];
  catalogItems: CatalogItem[];
  taxPercent: number;
  initialContingencyPercent: number;
  quoteNumber?: string | null;
  clientName?: string | null;
  date?: string;
  validUntil?: string | null;
  notes?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeItem(item: LineItem): LineItem {
  const quantity =
    item.dim2 != null && item.dim2 > 0
      ? Math.round(item.dim1 * (item.dim2 / 100) * 100) / 100
      : item.dim1;
  const linePrice = Math.round(quantity * item.unitPrice * 100) / 100;
  return { ...item, quantity, linePrice };
}

function dbToLine(db: DbItem, order: number): LineItem {
  return computeItem({
    id:            db.id,
    categoryId:    db.categoryId,
    catalogItemId: db.catalogItemId,
    name:          db.name,
    unit:          db.unit,
    dim1:          db.dim1 ?? 1,
    dim2:          db.dim2 ?? null,
    // Use stored costPrice; fall back to catalogItem cost, then unitPrice
    costPrice:     db.costPrice > 0
                     ? db.costPrice
                     : (db.catalogItem?.unitCost ?? 0),
    unitPrice:     db.unitPrice,
    profitPercent: db.profitPercent,
    quantity:      db.quantity,
    linePrice:     db.linePrice,
    order,
  });
}

// Gross margin %: (price - cost) / price × 100
function calcMarginPct(unitPrice: number, costPrice: number): number {
  if (unitPrice <= 0) return 0;
  return Math.round(((unitPrice - costPrice) / unitPrice) * 100 * 10) / 10;
}

// Est. line profit: (price - cost) × qty
function calcLineProfit(item: LineItem): number {
  return Math.round((item.unitPrice - item.costPrice) * item.quantity * 100) / 100;
}

// ─── Column layout for internal table ─────────────────────────────────────────

// # | desc | unit | dim1 | dim2 | qty | sell | cost | margin% | profit₪ | total | catalog | del
const GRID = "2rem 1fr 5.5rem 3.5rem 4rem 4.5rem 5.5rem 5.5rem 5rem 5.5rem 4.5rem 5rem 2rem";

// ─── Component ────────────────────────────────────────────────────────────────

export function QuoteCalculator({
  quoteId,
  initialItems,
  initialCategories,
  catalogItems,
  taxPercent,
  initialContingencyPercent,
  quoteNumber,
  clientName,
  date,
  validUntil,
  notes,
}: Props) {
  const t      = useTranslations("quotes");
  const locale = useLocale();
  const { fmtAmount } = useCurrency();

  const dateLocale = locale === "he" ? "he-IL" : "en-US";

  const fmtNum = (n: number) =>
    n.toLocaleString(dateLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtShekel = (n: number) => fmtAmount(n);
  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString(dateLocale, { day: "2-digit", month: "2-digit", year: "numeric" }); }
    catch { return d; }
  };

  const [viewMode,           setViewMode]           = useState<ViewMode>("internal");
  const [items,              setItems]               = useState<LineItem[]>(() =>
    initialItems.map((db, i) => dbToLine(db, i))
  );
  const [categories,         setCategories]          = useState<Category[]>(() =>
    initialCategories.map((c) => ({ ...c, _editing: false, _pendingName: c.name }))
  );
  const [contingencyPercent, setContingencyPercent]  = useState(initialContingencyPercent);
  const [isPending,          startTransition]        = useTransition();
  const [saved,              setSaved]               = useState(false);

  // ── Computed totals ─────────────────────────────────────────────────────────
  const subtotal         = Math.round(items.reduce((s, i) => s + i.linePrice, 0) * 100) / 100;
  const contingencyAmt   = Math.round(subtotal * (contingencyPercent / 100) * 100) / 100;
  const totalBeforeVat   = subtotal + contingencyAmt;
  const taxAmount        = Math.round(totalBeforeVat * (taxPercent / 100) * 100) / 100;
  const total            = Math.round((totalBeforeVat + taxAmount) * 100) / 100;

  // ── Internal profitability aggregates ──────────────────────────────────────
  const totalCost        = Math.round(items.reduce((s, i) => s + i.costPrice * i.quantity, 0) * 100) / 100;
  const totalProfit      = Math.round((subtotal - totalCost) * 100) / 100;
  const overallMarginPct = subtotal > 0 ? Math.round(((subtotal - totalCost) / subtotal) * 100 * 10) / 10 : 0;

  function categoryItems(catId: string) {
    return items.filter((i) => i.categoryId === catId);
  }
  function uncategorizedItems() {
    return items.filter((i) => i.categoryId === null);
  }
  function categorySubtotal(catId: string) {
    return Math.round(categoryItems(catId).reduce((s, i) => s + i.linePrice, 0) * 100) / 100;
  }
  function uncategorizedSubtotal() {
    return Math.round(uncategorizedItems().reduce((s, i) => s + i.linePrice, 0) * 100) / 100;
  }

  // ── Item mutators ───────────────────────────────────────────────────────────

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? computeItem({ ...item, ...patch }) : item))
    );
  }

  function handleCatalogSelect(itemId: string, catalogId: string) {
    const cat = catalogItems.find((c) => c.id === catalogId);
    if (!cat) return;

    if (cat.category) {
      const catName = cat.category.trim();
      const existingChapter = categories.find(
        (c) => c.name.trim().toLowerCase() === catName.toLowerCase()
      );

      if (existingChapter) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? computeItem({
                  ...item,
                  catalogItemId: cat.id,
                  name:          cat.name,
                  unit:          cat.unit,
                  costPrice:     cat.unitCost,
                  unitPrice:     cat.unitCost,
                  profitPercent: 0,
                  categoryId:    existingChapter.id,
                })
              : item
          )
        );
      } else {
        startTransition(async () => {
          const res = await createQuoteCategory(quoteId, catName);
          if (res.success) {
            const newChapter = {
              id:           res.category.id,
              name:         res.category.name,
              order:        res.category.order,
              _editing:     false,
              _pendingName: res.category.name,
            };
            setCategories((prev) => [...prev, newChapter]);
            setItems((prev) =>
              prev.map((item) =>
                item.id === itemId
                  ? computeItem({
                      ...item,
                      catalogItemId: cat.id,
                      name:          cat.name,
                      unit:          cat.unit,
                      costPrice:     cat.unitCost,
                      unitPrice:     cat.unitCost,
                      profitPercent: 0,
                      categoryId:    newChapter.id,
                    })
                  : item
              )
            );
            toast.success(t("calc.toastNewChapter", { name: catName }));
          }
        });
      }
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? computeItem({
                ...item,
                catalogItemId: cat.id,
                name:          cat.name,
                unit:          cat.unit,
                costPrice:     cat.unitCost,
                unitPrice:     cat.unitCost,
                profitPercent: 0,
              })
            : item
        )
      );
    }
  }

  function handleUnitPriceChange(itemId: string, raw: string) {
    const val = parseFloat(raw) || 0;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        // profitPercent stored as cost-based markup for compatibility
        const profitPercent =
          item.costPrice > 0
            ? Math.round(((val - item.costPrice) / item.costPrice) * 100 * 10) / 10
            : 0;
        return computeItem({ ...item, unitPrice: val, profitPercent });
      })
    );
  }

  function handleCostPriceChange(itemId: string, raw: string) {
    const cost = parseFloat(raw) || 0;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const profitPercent =
          cost > 0
            ? Math.round(((item.unitPrice - cost) / cost) * 100 * 10) / 10
            : 0;
        return computeItem({ ...item, costPrice: cost, profitPercent });
      })
    );
  }

  function handleAddRow(categoryId: string | null) {
    startTransition(async () => {
      const res = await addQuoteItem(quoteId, categoryId);
      if (res.success) {
        const newItem = res.item;
        setItems((prev) => [
          ...prev,
          computeItem({
            id:            newItem.id,
            categoryId,
            catalogItemId: null,
            name:          "",
            unit:          t("calc.unitDefault"),
            dim1:          1,
            dim2:          null,
            costPrice:     0,
            unitPrice:     0,
            profitPercent: 0,
            quantity:      1,
            linePrice:     0,
            order:         prev.length,
          }),
        ]);
      }
    });
  }

  function handleDeleteRow(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      await deleteQuoteItem(id);
    });
  }

  // ── Category mutators ───────────────────────────────────────────────────────

  function handleAddCategory() {
    startTransition(async () => {
      const res = await createQuoteCategory(quoteId, t("calc.newChapterName"));
      if (res.success) {
        setCategories((prev) => [
          ...prev,
          {
            id:           res.category.id,
            name:         res.category.name,
            order:        res.category.order,
            _editing:     true,
            _pendingName: res.category.name,
          },
        ]);
      }
    });
  }

  function startEditingCategory(id: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, _editing: true, _pendingName: c.name } : c))
    );
  }

  function cancelEditingCategory(id: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, _editing: false } : c))
    );
  }

  const catDebounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function handleCategoryNameChange(id: string, name: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, _pendingName: name } : c))
    );
    if (catDebounceRefs.current[id]) clearTimeout(catDebounceRefs.current[id]);
    catDebounceRefs.current[id] = setTimeout(async () => {
      await updateQuoteCategory(id, name);
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name, _editing: false } : c))
      );
    }, 700);
  }

  function commitCategoryName(id: string) {
    if (catDebounceRefs.current[id]) clearTimeout(catDebounceRefs.current[id]);
    const pendingName = categories.find((c) => c.id === id)?._pendingName ?? "";
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, name: pendingName, _editing: false } : c
      )
    );
    if (pendingName) {
      startTransition(async () => {
        await updateQuoteCategory(id, pendingName);
      });
    }
  }

  function handleDeleteCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setItems((prev) => prev.map((i) => (i.categoryId === id ? { ...i, categoryId: null } : i)));
    startTransition(async () => {
      await deleteQuoteCategory(id);
    });
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const payload = items.map((item, i) => ({
        id:            item.id,
        categoryId:    item.categoryId,
        catalogItemId: item.catalogItemId,
        name:          item.name,
        unit:          item.unit,
        dim1:          item.dim1,
        dim2:          item.dim2,
        quantity:      item.quantity,
        unitPrice:     item.unitPrice,
        costPrice:     item.costPrice,
        profitPercent: item.profitPercent,
        linePrice:     item.linePrice,
        order:         i,
      }));
      await saveQuoteItems(quoteId, payload, contingencyPercent);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }, [items, quoteId, contingencyPercent]);

  // ─────────────────────────────────────────────────────────────────────────────
  // ── INTERNAL VIEW HELPERS ───────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  function renderTableHeader() {
    return (
      <div
        className="grid items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b sticky top-0 z-10"
        style={{ gridTemplateColumns: GRID }}
      >
        <span className="text-center">#</span>
        <span>{t("calc.colDesc")}</span>
        <span className="text-center">{t("calc.colUnit")}</span>
        <span className="text-center">{t("calc.colDim1")}</span>
        <span className="text-center">{t("calc.colDim2")}</span>
        <span className="text-center">{t("calc.colQty")}</span>
        <span className="text-center">{t("calc.colUnitPrice")}</span>
        {/* ── INTERNAL-ONLY COLUMNS ── */}
        <span className="text-center text-amber-600/70">{t("calc.colCost")}</span>
        <span className="text-center text-emerald-600/70">{t("calc.colMarginPct")}</span>
        <span className="text-center text-emerald-600/70">{t("calc.colEstProfit")}</span>
        {/* ── end internal ── */}
        <span>{t("calc.colTotal")}</span>
        <span className="text-center">{t("calc.colCatalog")}</span>
        <span />
      </div>
    );
  }

  // ── Mobile card layout (< md) ──────────────────────────────────────────────
  // Contains every field from the desktop table, organised into logical rows.
  function renderItemRowMobile(item: LineItem, idx: number) {
    const marginPct = calcMarginPct(item.unitPrice, item.costPrice);

    return (
      <div key={item.id} className="px-3 py-3 space-y-2.5 border-b last:border-b-0">

        {/* ── Row 1: index · Description · Delete ── */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-5 text-center shrink-0 tabular-nums">
            {idx + 1}
          </span>
          <Input
            value={item.name}
            onChange={(e) => updateItem(item.id, { name: e.target.value })}
            className="h-8 text-sm flex-1 min-w-0"
            placeholder={t("calc.itemPlaceholder")}
          />
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleDeleteRow(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* ── Row 2: Qty (dim1) · Dim2 · Unit ── */}
        {/* dim1 labelled "כמות/Qty" to fix the corrupted "מ'1" label */}
        <div className="grid grid-cols-3 gap-1.5 ms-7">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground text-center">{t("calc.colQty")}</p>
            <Input
              type="number" min={0} step="any"
              value={item.dim1 || ""}
              onChange={(e) => updateItem(item.id, { dim1: parseFloat(e.target.value) || 0 })}
              className="h-8 text-sm text-center px-1"
            />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground text-center">{t("calc.colDim2")}</p>
            <Input
              type="number" min={0} step="any"
              value={item.dim2 ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? null : parseFloat(e.target.value);
                updateItem(item.id, { dim2: v });
              }}
              className="h-8 text-sm text-center px-1"
              placeholder="—"
            />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground text-center">{t("calc.colUnit")}</p>
            <Input
              value={item.unit}
              onChange={(e) => updateItem(item.id, { unit: e.target.value })}
              className="h-8 text-sm text-center px-1"
              placeholder={t("calc.unitDefault")}
            />
          </div>
        </div>

        {/* ── Row 3: Cost (editable) · Margin % (read-only) — management data ── */}
        <div className="grid grid-cols-2 gap-1.5 ms-7">
          <div className="space-y-0.5">
            <p className="text-[10px] text-amber-600/80 text-center">{t("calc.colCost")}</p>
            <Input
              type="number" min={0} step="any"
              value={item.costPrice || ""}
              onChange={(e) => handleCostPriceChange(item.id, e.target.value)}
              className="h-8 text-sm text-center px-1 border-amber-300/60 bg-amber-50/30 focus:border-amber-400"
              placeholder="0"
            />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-emerald-600/80 text-center">{t("calc.colMarginPct")}</p>
            <div className={cn(
              "h-8 flex items-center justify-center text-xs rounded-md border px-1 bg-emerald-50/30",
              marginPct < 0  ? "text-destructive border-destructive/30" :
              marginPct < 10 ? "text-amber-600 border-amber-300/40" :
                               "text-emerald-600 border-emerald-300/40",
            )}>
              {item.unitPrice > 0
                ? `${marginPct > 0 ? "+" : ""}${marginPct.toFixed(1)}%`
                : "—"}
            </div>
          </div>
        </div>

        {/* ── Row 4: Sell Price (editable) · Total (read-only) ── */}
        <div className="grid grid-cols-2 gap-1.5 ms-7">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground text-center">{t("calc.colUnitPrice")}</p>
            <Input
              type="number" min={0} step="any"
              value={item.unitPrice || ""}
              onChange={(e) => handleUnitPriceChange(item.id, e.target.value)}
              className="h-8 text-sm text-center px-1 font-medium"
            />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground text-center">{t("calc.colTotal")}</p>
            <div className="h-8 flex items-center justify-center text-sm font-semibold text-primary rounded-md border border-border bg-primary/5 px-1 tabular-nums">
              {fmtShekel(item.linePrice)}
            </div>
          </div>
        </div>

        {/* ── Row 5: Catalog picker (full width) ── */}
        <div className="ms-7">
          <Select
            value={item.catalogItemId ?? ""}
            onValueChange={(val) => handleCatalogSelect(item.id, val)}
          >
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue placeholder={t("calc.selectCatalog")} />
            </SelectTrigger>
            <SelectContent>
              {catalogItems.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // ── Desktop grid layout (md+) ────────────────────────────────────────────────
  function renderItemRow(item: LineItem, idx: number) {
    const marginPct  = calcMarginPct(item.unitPrice, item.costPrice);
    const lineProfit = calcLineProfit(item);

    return (
      <div
        key={item.id}
        className="grid items-center gap-1 px-3 py-1 border-b last:border-b-0 hover:bg-muted/20"
        style={{ gridTemplateColumns: GRID }}
      >
        <span className="text-center text-xs text-muted-foreground">{idx + 1}</span>

        <Input
          value={item.name}
          onChange={(e) => updateItem(item.id, { name: e.target.value })}
          className="h-7 text-sm"
          placeholder={t("calc.itemPlaceholder")}
        />

        <Input
          value={item.unit}
          onChange={(e) => updateItem(item.id, { unit: e.target.value })}
          className="h-7 text-sm text-center"
          placeholder={t("calc.unitDefault")}
        />

        <Input
          type="number" min={0} step="any"
          value={item.dim1 || ""}
          onChange={(e) => updateItem(item.id, { dim1: parseFloat(e.target.value) || 0 })}
          className="h-7 text-sm text-center"
        />

        <Input
          type="number" min={0} step="any"
          value={item.dim2 ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? null : parseFloat(e.target.value);
            updateItem(item.id, { dim2: v });
          }}
          className="h-7 text-sm text-center"
          placeholder="—"
        />

        {/* quantity (read-only) */}
        <div className="h-7 flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-md border px-1">
          {fmtNum(item.quantity)}
        </div>

        {/* Selling price */}
        <Input
          type="number" min={0} step="any"
          value={item.unitPrice || ""}
          onChange={(e) => handleUnitPriceChange(item.id, e.target.value)}
          className="h-7 text-sm text-center"
        />

        {/* ── INTERNAL: Cost price (editable) ── */}
        <Input
          type="number" min={0} step="any"
          value={item.costPrice || ""}
          onChange={(e) => handleCostPriceChange(item.id, e.target.value)}
          className="h-7 text-sm text-center border-amber-300/60 bg-amber-50/30 focus:border-amber-400"
          placeholder="0"
        />

        {/* ── INTERNAL: Gross margin % (read-only) ── */}
        <div className={cn(
          "h-7 flex items-center justify-center text-xs rounded-md border px-1 bg-emerald-50/30",
          marginPct < 0  ? "text-destructive border-destructive/30" :
          marginPct < 10 ? "text-amber-600 border-amber-300/40" :
                           "text-emerald-600 border-emerald-300/40"
        )}>
          {item.unitPrice > 0
            ? `${marginPct > 0 ? "+" : ""}${marginPct.toFixed(1)}%`
            : "—"}
        </div>

        {/* ── INTERNAL: Est. profit in currency (read-only) ── */}
        <div className={cn(
          "h-7 flex items-center justify-center text-xs rounded-md border px-1 bg-emerald-50/30",
          lineProfit < 0 ? "text-destructive border-destructive/30" : "text-emerald-600 border-emerald-300/40"
        )}>
          {item.unitPrice > 0 ? fmtShekel(lineProfit) : "—"}
        </div>

        {/* Total */}
        <div className="h-7 flex items-center text-sm font-medium px-1">
          {fmtShekel(item.linePrice)}
        </div>

        <Select
          value={item.catalogItemId ?? ""}
          onValueChange={(val) => handleCatalogSelect(item.id, val)}
        >
          <SelectTrigger className="h-7 text-xs w-full">
            <SelectValue placeholder={t("calc.selectCatalog")} />
          </SelectTrigger>
          <SelectContent>
            {catalogItems.map((cat) => (
              <SelectItem key={cat.id} value={cat.id} className="text-xs">
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => handleDeleteRow(item.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  function renderCategorySection(cat: Category) {
    const catItems = categoryItems(cat.id);
    const catTotal = categorySubtotal(cat.id);

    return (
      <div key={cat.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Category header */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            {cat._editing ? (
              <div className="flex items-center gap-1.5 flex-1">
                <Input
                  autoFocus
                  value={cat._pendingName}
                  onChange={(e) => handleCategoryNameChange(cat.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")  commitCategoryName(cat.id);
                    if (e.key === "Escape") cancelEditingCategory(cat.id);
                  }}
                  onBlur={() => commitCategoryName(cat.id)}
                  className="h-7 text-sm font-semibold max-w-xs"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cancelEditingCategory(cat.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <span className="text-sm font-semibold text-foreground truncate">{cat.name}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-medium text-primary">{fmtShekel(catTotal)}</span>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => startEditingCategory(cat.id)}
              title={t("calc.renameCategory")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => handleDeleteCategory(cat.id)}
              title={t("calc.deleteCategory")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Items — mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {catItems.length === 0 ? (
            <div className="py-5 text-center text-sm text-muted-foreground">
              {t("calc.emptyCategory")}
            </div>
          ) : (
            catItems.map((item, idx) => renderItemRowMobile(item, idx))
          )}
        </div>

        {/* Items — desktop scrollable table */}
        <ScrollArea className="hidden md:block w-full">
          <div style={{ minWidth: 1060 }}>
            {renderTableHeader()}
            {catItems.length === 0 ? (
              <div className="py-5 text-center text-sm text-muted-foreground">
                {t("calc.emptyCategory")}
              </div>
            ) : (
              catItems.map((item, idx) => renderItemRow(item, idx))
            )}
          </div>
        </ScrollArea>

        {/* Chapter subtotal + add row */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-t border-border">
          <Button
            variant="ghost" size="sm"
            onClick={() => handleAddRow(cat.id)}
            disabled={isPending}
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("calc.addRow")}
          </Button>
          <div className="text-xs text-muted-foreground">
            {t("calc.catSubtotal", { name: cat.name })}:{" "}
            <span className="font-bold text-primary">{fmtShekel(catTotal)}</span>
          </div>
        </div>
      </div>
    );
  }

  function renderUncategorizedSection() {
    const uncatItems = uncategorizedItems();
    const uncatTotal = uncategorizedSubtotal();
    if (uncatItems.length === 0 && categories.length > 0) return null;

    return (
      <div className="rounded-xl border border-dashed border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-dashed border-border">
          <div className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{t("calc.noCategory")}</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
              {uncatItems.length}
            </Badge>
          </div>
          <span className="text-xs font-medium text-muted-foreground">{fmtShekel(uncatTotal)}</span>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {uncatItems.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t("calc.emptyUncategorized")}
            </div>
          ) : (
            uncatItems.map((item, idx) => renderItemRowMobile(item, idx))
          )}
        </div>

        {/* Desktop scrollable table */}
        <ScrollArea className="hidden md:block w-full">
          <div style={{ minWidth: 1060 }}>
            {renderTableHeader()}
            {uncatItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t("calc.emptyUncategorized")}
              </div>
            ) : (
              uncatItems.map((item, idx) => renderItemRow(item, idx))
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center px-4 py-2 bg-muted/20 border-t border-dashed border-border">
          <Button
            variant="ghost" size="sm"
            onClick={() => handleAddRow(null)}
            disabled={isPending}
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("calc.addRowUncategorized")}
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ── CLIENT VIEW ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  function renderClientView() {
    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
    const uncatItems = uncategorizedItems();
    const dir = locale === "he" ? "rtl" : "ltr";

    return (
      <div
        dir={dir}
        className="bg-white rounded-xl border border-border shadow-md print:shadow-none print:border-0 overflow-hidden"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        {/* Document header */}
        <div className="bg-gradient-to-l from-primary/5 to-primary/10 px-8 py-6 border-b border-border">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">
                {t("calc.docTitle", { number: quoteNumber ?? "" })}
              </h1>
              {clientName && (
                <p className="text-base text-muted-foreground">
                  {t("calc.forClient")}: <span className="font-medium text-foreground">{clientName}</span>
                </p>
              )}
            </div>
            <div className="text-sm text-muted-foreground text-end space-y-1 shrink-0">
              {date && (
                <p>{t("calc.docDate")}: <span className="font-medium text-foreground">{fmtDate(date)}</span></p>
              )}
              {validUntil && (
                <p>{t("calc.docValidUntil")}: <span className="font-medium text-foreground">{fmtDate(validUntil)}</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">
          {/* Categories */}
          {sortedCategories.map((cat, catIdx) => {
            const catItems = categoryItems(cat.id);
            const catTotal = categorySubtotal(cat.id);

            return (
              <div key={cat.id}>
                <div className="flex items-baseline justify-between mb-3 pb-2 border-b-2 border-primary/20">
                  <h2 className="text-base font-bold text-foreground">
                    {t("calc.chapterPrefix")} {catIdx + 1} — {cat.name}
                  </h2>
                </div>

                {catItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">
                    {t("calc.emptyCategory")}
                  </p>
                ) : (
                  /* CLIENT VIEW: no cost / margin / profit columns */
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-start py-2 px-2 text-xs font-semibold text-muted-foreground w-8">#</th>
                        <th className="text-start py-2 px-2 text-xs font-semibold text-muted-foreground">{t("calc.colDesc")}</th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground w-20">{t("calc.colUnit")}</th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground w-24">{t("calc.colQty")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catItems.map((item, i) => (
                        <tr key={item.id} className="border-b border-border/40 hover:bg-muted/20">
                          <td className="py-2 px-2 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="py-2 px-2">{item.name || <span className="text-muted-foreground italic">{t("calc.noItemName")}</span>}</td>
                          <td className="py-2 px-2 text-center text-muted-foreground">{item.unit}</td>
                          <td className="py-2 px-2 text-center tabular-nums">{fmtNum(item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="flex justify-end mt-3">
                  <div className="rounded-lg bg-primary/5 border border-primary/20 px-5 py-2.5 text-sm">
                    <span className="text-muted-foreground">{t("calc.catSubtotal", { name: cat.name })}: </span>
                    <span className="font-bold text-primary text-base">{fmtShekel(catTotal)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Uncategorized items */}
          {uncatItems.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-dashed border-border">
                <h2 className="text-base font-semibold text-muted-foreground">{t("calc.additionalItems")}</h2>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-start py-2 px-2 text-xs font-semibold text-muted-foreground w-8">#</th>
                    <th className="text-start py-2 px-2 text-xs font-semibold text-muted-foreground">{t("calc.colDesc")}</th>
                    <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground w-20">{t("calc.colUnit")}</th>
                    <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground w-24">{t("calc.colQty")}</th>
                  </tr>
                </thead>
                <tbody>
                  {uncatItems.map((item, i) => (
                    <tr key={item.id} className="border-b border-border/40">
                      <td className="py-2 px-2 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="py-2 px-2">{item.name || <span className="text-muted-foreground italic">{t("calc.noItemName")}</span>}</td>
                      <td className="py-2 px-2 text-center text-muted-foreground">{item.unit}</td>
                      <td className="py-2 px-2 text-center tabular-nums">{fmtNum(item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end mt-3">
                <div className="rounded-lg bg-muted/40 border border-border px-5 py-2.5 text-sm">
                  <span className="text-muted-foreground">{t("calc.additionalSubtotal")}: </span>
                  <span className="font-bold text-foreground text-base">{fmtShekel(uncategorizedSubtotal())}</span>
                </div>
              </div>
            </div>
          )}

          {/* Grand total — client view includes contingency line if set, hides internal data */}
          <div className="border-t-2 border-border pt-6 mt-4">
            <div className="flex justify-end">
              <div className="w-72 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("calc.subtotalBeforeTax")}</span>
                  <span className="font-medium">{fmtShekel(subtotal)}</span>
                </div>
                {contingencyPercent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("calc.contingency")} ({contingencyPercent.toFixed(1)}%)
                    </span>
                    <span className="font-medium">{fmtShekel(contingencyAmt)}</span>
                  </div>
                )}
                {(contingencyPercent > 0) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("calc.totalBeforeVat")}</span>
                    <span className="font-medium">{fmtShekel(totalBeforeVat)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("calc.tax", { pct: taxPercent })}</span>
                  <span className="font-medium">{fmtShekel(taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>{t("calc.grandTotal")}</span>
                  <span className="text-primary text-lg">{fmtShekel(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {notes && (
            <div className="border-t border-border/50 pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                {t("calc.notesLabel")}
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ── RENDER ───────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 pb-28 md:pb-0">
      {/* ── View toggle ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 p-1 rounded-lg bg-muted/50 border border-border w-fit">
        <button
          type="button"
          onClick={() => setViewMode("internal")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            viewMode === "internal"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <PencilLine className="h-3.5 w-3.5" />
          {t("calc.viewInternal")}
        </button>
        <button
          type="button"
          onClick={() => setViewMode("client")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            viewMode === "client"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          {t("calc.viewClient")}
        </button>
      </div>

      {viewMode === "client" ? (
        // ── CLIENT VIEW ──────────────────────────────────────────────────────
        renderClientView()
      ) : (
        // ── INTERNAL VIEW ────────────────────────────────────────────────────
        <>
          {/* Category sections */}
          {[...categories].sort((a, b) => a.order - b.order).map((cat) =>
            renderCategorySection(cat)
          )}

          {/* Uncategorized section */}
          {renderUncategorizedSection()}

          {/* Bottom actions — stacked on mobile, inline on desktop */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              variant="outline" size="sm"
              onClick={handleAddCategory}
              disabled={isPending}
              className="gap-2 w-full sm:w-auto"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
              {t("calc.addCategory")}
            </Button>

            <Button
              onClick={handleSave}
              disabled={isPending}
              className="gap-2 w-full sm:w-auto sm:ms-auto"
              size="sm"
            >
              {saved ? (
                <><Check className="h-4 w-4" />{t("calc.saved")}</>
              ) : isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{t("calc.saving")}</>
              ) : (
                <><Save className="h-4 w-4" />{t("calc.save")}</>
              )}
            </Button>
          </div>

          {/* Summary panel */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start">

            {/* ── Internal profitability card (hidden from client) ── */}
            <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 shadow-sm p-4 flex-1 max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  {t("calc.internalProfitLabel")}
                </span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("calc.subtotal")}</span>
                  <span>{fmtShekel(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("calc.totalCost")}</span>
                  <span className="text-amber-700">{fmtShekel(totalCost)}</span>
                </div>
                <Separator className="my-1 bg-emerald-200/50" />
                <div className="flex justify-between font-semibold">
                  <span className="text-emerald-700">{t("calc.internalProfitLabel")}</span>
                  <span className={totalProfit >= 0 ? "text-emerald-600" : "text-destructive"}>
                    {fmtShekel(totalProfit)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t("calc.internalMarginLabel")}</span>
                  <span className={overallMarginPct >= 0 ? "text-emerald-600" : "text-destructive"}>
                    {overallMarginPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* ── Quote totals panel ── */}
            <div className="w-80 rounded-lg border bg-card shadow-sm">
              <div className="p-4 space-y-2">
                {/* Per-category subtotals */}
                {categories.length > 0 && (
                  <>
                    {[...categories].sort((a, b) => a.order - b.order).map((cat) => (
                      <div key={cat.id} className="flex justify-between text-xs text-muted-foreground">
                        <span className="truncate max-w-[160px]">{cat.name}</span>
                        <span>{fmtShekel(categorySubtotal(cat.id))}</span>
                      </div>
                    ))}
                    {uncategorizedItems().length > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t("calc.noChapter")}</span>
                        <span>{fmtShekel(uncategorizedSubtotal())}</span>
                      </div>
                    )}
                    <Separator className="my-1" />
                  </>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("calc.subtotal")}</span>
                  <span>{fmtShekel(subtotal)}</span>
                </div>

                {/* ── Contingency ── */}
                <div className="flex items-center justify-between gap-2 py-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm text-muted-foreground shrink-0">
                      {t("calc.contingencyPct")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={contingencyPercent || ""}
                        onChange={(e) => setContingencyPercent(parseFloat(e.target.value) || 0)}
                        className="h-6 w-14 text-xs text-center px-1"
                        placeholder="0"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  <span className={cn(
                    "text-sm tabular-nums",
                    contingencyAmt > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"
                  )}>
                    {contingencyAmt > 0 ? fmtShekel(contingencyAmt) : "—"}
                  </span>
                </div>

                {contingencyPercent > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t("calc.totalBeforeVat")}</span>
                    <span className="font-medium text-foreground">{fmtShekel(totalBeforeVat)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("calc.tax", { pct: taxPercent })}</span>
                  <span>{fmtShekel(taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>{t("calc.grandTotal")}</span>
                  <span className="text-primary">{fmtShekel(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
