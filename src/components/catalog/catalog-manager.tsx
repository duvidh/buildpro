"use client";

import { useState, useTransition, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useCurrency } from "@/lib/currency-context";
import { useMeasurement } from "@/lib/measurement-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus, Pencil, Trash2, Sparkles, Loader2, Package,
  Download, Upload, FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  createCatalogItem, updateCatalogItem, deleteCatalogItem,
  seedCatalogItems, bulkImportCatalogItems, bulkDeleteCatalogItems,
} from "@/actions/catalog";
import { buildCatalogItemSchema, type CatalogItemInput } from "@/lib/schemas/catalog-schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type CatalogItem = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  unitCost: number;
  category: string | null;
  description: string | null;
};

type Props = { initialItems: CatalogItem[] };

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function buildCsvRow(cells: string[]) {
  return cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(",");
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const BOM    = "﻿"; // UTF-8 BOM for Excel
  const header = buildCsvRow(headers);
  const body   = rows.map(buildCsvRow).join("\n");
  const blob   = new Blob([BOM + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement("a");
  a.href       = url;
  a.download   = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim()); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Item dialog (add / edit) ─────────────────────────────────────────────────

function ItemDialog({
  trigger, title, defaultValues, onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  defaultValues?: Partial<CatalogItemInput>;
  onSubmit: (data: CatalogItemInput) => Promise<void>;
}) {
  const t      = useTranslations("catalog");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const schema = useMemo(
    () => buildCatalogItemSchema({
      nameRequired: t("validation.nameRequired"),
      unitRequired: t("validation.unitRequired"),
    }),
    [t],
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CatalogItemInput>({
    resolver: zodResolver(schema),
    defaultValues: { unit: t("unitDefault"), ...defaultValues },
  });

  function submit(data: CatalogItemInput) {
    startTransition(async () => {
      await onSubmit(data);
      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md" dir={locale === "he" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4 mt-2">

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("form.name")}</Label>
            <Input id="name" {...register("name")} placeholder={t("form.namePlaceholder")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku">{t("form.sku")}</Label>
              <Input id="sku" {...register("sku")} placeholder="FLR-GRN-001" dir="ltr" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">{t("form.category")}</Label>
              <Input id="category" {...register("category")} placeholder={t("form.categoryPlaceholder")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit">{t("form.unit")}</Label>
              <Input id="unit" {...register("unit")} placeholder={t("form.unitCost")} />
              {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unitCost">{t("form.unitCost")}</Label>
              <Input id="unitCost" type="number" min={0} step="any" {...register("unitCost")} placeholder="0" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">{t("form.description")}</Label>
            <Textarea id="description" rows={2} {...register("description")} placeholder={t("form.descPlaceholder")} />
          </div>

          <Button type="submit" disabled={isPending} className="self-end min-w-[80px]">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("form.save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Import dialog ────────────────────────────────────────────────────────────

function ImportDialog({ onDone }: { onDone: () => void }) {
  const t      = useTranslations("catalog");
  const tCommon = useTranslations("common");
  const locale  = useLocale();

  const [open, setOpen]         = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview]   = useState<string[][] | null>(null);
  const [rawRows, setRawRows]   = useState<string[][] | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const csvHeaders = [
    t("csvHeaders.name"),
    t("csvHeaders.sku"),
    t("csvHeaders.category"),
    t("csvHeaders.unit"),
    t("csvHeaders.unitCost"),
    t("csvHeaders.description"),
  ];

  function parseFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text  = (e.target?.result as string) ?? "";
      const clean = text.replace(/^﻿/, "");
      const lines = clean.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) { toast.error(t("import.toastEmpty")); return; }
      const dataLines = lines.slice(1);
      const rows = dataLines.map(parseCsvLine);
      setRawRows(rows);
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(file, "UTF-8");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  function handleImport() {
    if (!rawRows) return;
    const rows = rawRows
      .map((r) => ({
        name:        r[0] ?? "",
        sku:         r[1] ?? "",
        category:    r[2] ?? "",
        unit:        r[3] ?? t("unitDefault"),
        unitCost:    parseFloat(r[4] ?? "0") || 0,
        description: r[5] ?? "",
      }))
      .filter((r) => r.name.trim() && r.unit.trim());

    startTransition(async () => {
      const res = await bulkImportCatalogItems(rows);
      if (res.success) {
        toast.success(t("import.toastSuccess", { count: res.count }));
        setOpen(false);
        setPreview(null);
        setRawRows(null);
        onDone();
      } else {
        toast.error(res.error ?? t("import.toastError"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setPreview(null); setRawRows(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          {t("toolbar.import")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" dir={locale === "he" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{t("import.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
              p-8 cursor-pointer transition-colors
              ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}
            `}
          >
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{t("import.dropTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("import.dropHint")}</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* Preview */}
          {preview && (
            <div className="rounded-lg border overflow-hidden">
              <p className="text-xs font-semibold text-muted-foreground px-3 py-2 bg-muted/40 border-b">
                {t("import.preview", { count: rawRows?.length ?? 0 })}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      {csvHeaders.map((h) => (
                        <th key={h} className="px-2 py-1.5 text-start font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {row.map((cell, j) => (
                          <td key={j} className="px-2 py-1 text-foreground/80 max-w-[120px] truncate">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>{tCommon("cancel")}</Button>
            <Button
              onClick={handleImport}
              disabled={!rawRows || isPending}
              className="gap-2 min-w-[120px]"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {t("import.importBtn")} {rawRows ? `(${rawRows.length})` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CatalogManager({ initialItems }: Props) {
  const t      = useTranslations("catalog");
  const locale = useLocale();
  const { fmtCompact } = useCurrency();
  const { areaUnit } = useMeasurement();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── Multi-select state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => initialItems.map((i) => i.id), [initialItems]);
  const allSelected = allIds.length > 0 && selectedIds.size === allIds.length;

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) => (prev.size === allIds.length ? new Set() : new Set(allIds)));
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await bulkDeleteCatalogItems(ids);
      if (res.success) {
        toast.success(t("toast.bulkDeleteSuccess", { count: res.count }));
        setSelectedIds(new Set());
        router.refresh();
      }
    });
  }

  const dateLocale = locale === "he" ? "he-IL" : "en-US";

  const csvHeaders = [
    t("csvHeaders.name"),
    t("csvHeaders.sku"),
    t("csvHeaders.category"),
    t("csvHeaders.unit"),
    t("csvHeaders.unitCost"),
    t("csvHeaders.description"),
  ];

  function handleSeed() {
    startTransition(async () => {
      await seedCatalogItems();
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCatalogItem(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      router.refresh();
    });
  }

  function handleExport() {
    if (initialItems.length === 0) { toast.error(t("toast.exportEmpty")); return; }
    const rows = initialItems.map((item) => [
      item.name,
      item.sku         ?? "",
      item.category    ?? "",
      item.unit,
      String(item.unitCost),
      item.description ?? "",
    ]);
    downloadCsv("catalog-export.csv", csvHeaders, rows);
    toast.success(t("toast.exportSuccess", { count: rows.length }));
  }

  function handleDownloadTemplate() {
    downloadCsv("catalog-template.csv", csvHeaders, [
      [t("templateRows.name1"), "SKU-001", t("templateRows.category1"), areaUnit, "65", t("templateRows.desc1")],
      [t("templateRows.name2"), "LAB-001", t("templateRows.category2"), t("templateRows.unit2"), "120", t("templateRows.desc2")],
    ]);
    toast.success(t("toast.templateSuccess"));
  }

  // group by category
  const categories = Array.from(
    new Set(initialItems.map((i) => i.category ?? t("defaultCategory")))
  ).sort();

  return (
    <div className="flex flex-col gap-6">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {initialItems.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-primary"
                checked={allSelected}
                onChange={toggleAll}
              />
              {t("selection.selectAll")}
            </label>
          )}
          <p className="text-sm text-muted-foreground">
            {t("itemCount", { count: initialItems.length })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seed demo */}
          {initialItems.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeed} disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t("toolbar.seed")}
            </Button>
          )}

          {/* Template download */}
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
            <Download className="h-4 w-4" />
            {t("toolbar.downloadTemplate")}
          </Button>

          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2" disabled={initialItems.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            {t("toolbar.export")}
          </Button>

          {/* Import */}
          <ImportDialog onDone={() => router.refresh()} />

          {/* New item */}
          <ItemDialog
            trigger={
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("toolbar.newItem")}
              </Button>
            }
            title={t("form.addTitle")}
            onSubmit={async (data) => {
              await createCatalogItem(data);
              router.refresh();
            }}
          />
        </div>
      </div>

      {/* ── Selection action bar ── */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            {t("selection.selectedCount", { count: selectedIds.size })}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              {t("selection.clear")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={handleBulkDelete}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("selection.deleteSelected", { count: selectedIds.size })}
            </Button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {initialItems.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center text-muted-foreground">
          <Package className="h-12 w-12 opacity-30" />
          <p className="text-sm">{t("empty")}</p>
        </div>
      )}

      {/* ── Table per category ── */}
      {categories.map((cat) => {
        const catItems = initialItems.filter((i) => (i.category ?? t("defaultCategory")) === cat);
        const catAllSelected = catItems.length > 0 && catItems.every((i) => selectedIds.has(i.id));
        const toggleCategory = () => {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            if (catItems.every((i) => next.has(i.id))) {
              catItems.forEach((i) => next.delete(i.id));
            } else {
              catItems.forEach((i) => next.add(i.id));
            }
            return next;
          });
        };
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">{cat}</Badge>
              <span className="text-xs text-muted-foreground">{t("catItemCount", { count: catItems.length })}</span>
            </div>
            <div className="rounded-xl border border-border overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer accent-primary align-middle"
                        checked={catAllSelected}
                        onChange={toggleCategory}
                        aria-label={t("selection.selectAll")}
                      />
                    </TableHead>
                    <TableHead className="font-semibold">{t("table.name")}</TableHead>
                    <TableHead className="w-28 font-semibold">{t("table.sku")}</TableHead>
                    <TableHead className="w-20 text-center font-semibold">{t("table.unit")}</TableHead>
                    <TableHead className="w-32 text-center font-semibold">{t("table.unitCost")}</TableHead>
                    <TableHead className="font-semibold">{t("table.description")}</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className={`hover:bg-muted/20 ${selectedIds.has(item.id) ? "bg-primary/5" : ""}`}
                    >
                      <TableCell className="w-10">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-primary align-middle"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleOne(item.id)}
                          aria-label={item.name}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono" dir="ltr">
                        {item.sku ?? <span className="opacity-40">—</span>}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="text-center font-medium">
                        {fmtCompact(item.unitCost)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {item.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <ItemDialog
                            trigger={
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            }
                            title={t("form.editTitle")}
                            defaultValues={{
                              name:        item.name,
                              sku:         item.sku         ?? "",
                              unit:        item.unit,
                              unitCost:    String(item.unitCost),
                              category:    item.category    ?? "",
                              description: item.description ?? "",
                            }}
                            onSubmit={async (data) => {
                              await updateCatalogItem(item.id, data);
                              router.refresh();
                            }}
                          />
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(item.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
