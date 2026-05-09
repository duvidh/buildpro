"use client";

import { useState, useTransition, useCallback } from "react";
import { Trash2, Plus, Save, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { addQuoteItem, deleteQuoteItem, saveQuoteItems } from "@/actions/quotes";

// ─── Types ────────────────────────────────────────────────────────────────────

type CatalogItem = {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
  category: string | null;
};

type DbItem = {
  id: string;
  catalogItemId: string | null;
  name: string;
  unit: string;
  dim1: number | null;
  dim2: number | null;
  quantity: number;
  unitPrice: number;
  profitPercent: number;
  linePrice: number;
  order: number;
  catalogItem: { id: string; name: string; unit: string; unitCost: number } | null;
};

type LineItem = {
  id: string;
  catalogItemId: string | null;
  name: string;
  unit: string;
  dim1: number;
  dim2: number | null;
  _unitCost: number;
  unitPrice: number;
  profitPercent: number;
  quantity: number;
  linePrice: number;
  order: number;
};

type Props = {
  quoteId: string;
  initialItems: DbItem[];
  catalogItems: CatalogItem[];
  taxPercent: number;
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
    id: db.id,
    catalogItemId: db.catalogItemId,
    name: db.name,
    unit: db.unit,
    dim1: db.dim1 ?? 1,
    dim2: db.dim2 ?? null,
    _unitCost: db.catalogItem?.unitCost ?? db.unitPrice,
    unitPrice: db.unitPrice,
    profitPercent: db.profitPercent,
    quantity: db.quantity,
    linePrice: db.linePrice,
    order,
  });
}

function fmtNum(n: number) {
  return n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuoteCalculator({ quoteId, initialItems, catalogItems, taxPercent }: Props) {
  const [items, setItems] = useState<LineItem[]>(() =>
    initialItems.map((db, i) => dbToLine(db, i))
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const subtotal = Math.round(items.reduce((s, i) => s + i.linePrice, 0) * 100) / 100;
  const taxAmount = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  // ── Mutators ────────────────────────────────────────────────────────────────

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? computeItem({ ...item, ...patch }) : item))
    );
  }

  function handleCatalogSelect(itemId: string, catalogId: string) {
    const cat = catalogItems.find((c) => c.id === catalogId);
    if (!cat) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? computeItem({
              ...item,
              catalogItemId: cat.id,
              name: cat.name,
              unit: cat.unit,
              _unitCost: cat.unitCost,
              unitPrice: cat.unitCost,
              profitPercent: 0,
            })
          : item
      )
    );
  }

  function handleUnitPriceChange(itemId: string, raw: string) {
    const val = parseFloat(raw) || 0;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const profitPercent =
          item._unitCost > 0
            ? Math.round(((val - item._unitCost) / item._unitCost) * 100 * 10) / 10
            : 0;
        return computeItem({ ...item, unitPrice: val, profitPercent });
      })
    );
  }

  function handleAddRow() {
    startTransition(async () => {
      const res = await addQuoteItem(quoteId);
      if (res.success) {
        const newItem = res.item;
        setItems((prev) => [
          ...prev,
          computeItem({
            id: newItem.id,
            catalogItemId: null,
            name: "",
            unit: "יח'",
            dim1: 1,
            dim2: null,
            _unitCost: 0,
            unitPrice: 0,
            profitPercent: 0,
            quantity: 1,
            linePrice: 0,
            order: prev.length,
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

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const payload = items.map((item, i) => ({
        id: item.id,
        catalogItemId: item.catalogItemId,
        name: item.name,
        unit: item.unit,
        dim1: item.dim1,
        dim2: item.dim2,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        profitPercent: item.profitPercent,
        linePrice: item.linePrice,
        order: i,
      }));
      await saveQuoteItems(quoteId, payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }, [items, quoteId]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Table */}
      <ScrollArea className="w-full rounded-md border">
        <div style={{ minWidth: 920 }}>
          {/* Header row */}
          <div className="grid items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b" style={{ gridTemplateColumns: "2rem 1fr 8rem 4rem 5rem 5rem 5rem 5rem 4.5rem 5rem 2rem" }}>
            <span className="text-center">#</span>
            <span>תיאור / מקטלוג</span>
            <span className="text-center">יחידה</span>
            <span className="text-center">מ&apos;1</span>
            <span className="text-center">מ&apos;2 (ס&quot;מ)</span>
            <span className="text-center">כמות</span>
            <span className="text-center">מחיר ליח&apos;</span>
            <span className="text-center">רווח%</span>
            <span className="text-start">סה&quot;כ</span>
            <span className="text-center">מקטלוג</span>
            <span />
          </div>

          {/* Item rows */}
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="grid items-center gap-1 px-3 py-1 border-b last:border-b-0 hover:bg-muted/20"
              style={{ gridTemplateColumns: "2rem 1fr 8rem 4rem 5rem 5rem 5rem 5rem 4.5rem 5rem 2rem" }}
            >
              {/* # */}
              <span className="text-center text-xs text-muted-foreground">{idx + 1}</span>

              {/* Description */}
              <Input
                value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                className="h-7 text-sm"
                placeholder="שם פריט"
              />

              {/* Unit */}
              <Input
                value={item.unit}
                onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                className="h-7 text-sm text-center"
                placeholder='יח&apos;'
              />

              {/* dim1 */}
              <Input
                type="number"
                min={0}
                step="any"
                value={item.dim1 || ""}
                onChange={(e) => updateItem(item.id, { dim1: parseFloat(e.target.value) || 0 })}
                className="h-7 text-sm text-center"
              />

              {/* dim2 */}
              <Input
                type="number"
                min={0}
                step="any"
                value={item.dim2 ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : parseFloat(e.target.value);
                  updateItem(item.id, { dim2: v });
                }}
                className="h-7 text-sm text-center"
                placeholder="—"
              />

              {/* quantity (computed, read-only) */}
              <div className="h-7 flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-md border px-1">
                {fmtNum(item.quantity)}
              </div>

              {/* unitPrice */}
              <Input
                type="number"
                min={0}
                step="any"
                value={item.unitPrice || ""}
                onChange={(e) => handleUnitPriceChange(item.id, e.target.value)}
                className="h-7 text-sm text-center"
              />

              {/* profitPercent */}
              <div className={`h-7 flex items-center justify-center text-sm rounded-md border px-1 ${item.profitPercent < 0 ? "text-destructive" : "text-muted-foreground"} bg-muted/30`}>
                {item.profitPercent !== 0 ? `${item.profitPercent > 0 ? "+" : ""}${item.profitPercent.toFixed(1)}%` : "—"}
              </div>

              {/* linePrice */}
              <div className="h-7 flex items-center text-sm font-medium px-1">
                ₪{fmtNum(item.linePrice)}
              </div>

              {/* Catalog picker */}
              <Select
                value={item.catalogItemId ?? ""}
                onValueChange={(val) => handleCatalogSelect(item.id, val)}
              >
                <SelectTrigger className="h-7 text-xs w-full">
                  <SelectValue placeholder="בחר" />
                </SelectTrigger>
                <SelectContent>
                  {catalogItems.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteRow(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {/* Empty state */}
          {items.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              אין פריטים — לחץ &quot;הוסף שורה&quot; להתחיל
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add row + Save */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddRow}
          disabled={isPending}
          className="gap-2"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          הוסף שורה
        </Button>

        <Button
          onClick={handleSave}
          disabled={isPending}
          className="gap-2"
          size="sm"
        >
          {saved ? (
            <><Check className="h-4 w-4" />נשמר!</>
          ) : isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" />שומר...</>
          ) : (
            <><Save className="h-4 w-4" />שמור הצעה</>
          )}
        </Button>
      </div>

      {/* Summary panel */}
      <div className="flex justify-end">
        <div className="w-72 rounded-lg border bg-card shadow-sm">
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">סכום ביניים</span>
              <span>₪{fmtNum(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">מע&quot;מ {taxPercent}%</span>
              <span>₪{fmtNum(taxAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>סה&quot;כ לתשלום</span>
              <span className="text-primary">₪{fmtNum(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
