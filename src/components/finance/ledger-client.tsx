"use client";

import { useCurrency } from "@/lib/currency-context";
import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight, Search, FolderKanban } from "lucide-react";
import type { LedgerEntry } from "@/actions/finance";

// ─── Config (className/icon only — labels from translations) ──────────────────

const TYPE_CONFIG: Record<LedgerEntry["type"], {
  badgeCls: string; icon: React.ElementType;
  iconCls: string; amountCls: string; sign: string;
}> = {
  INBOUND: {
    badgeCls:  "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon:      ArrowDownLeft,
    iconCls:   "text-emerald-600",
    amountCls: "text-emerald-700 font-semibold",
    sign:      "+",
  },
  OUTBOUND_SUPPLIER: {
    badgeCls:  "bg-red-100 text-red-700 border-red-200",
    icon:      ArrowUpRight,
    iconCls:   "text-red-500",
    amountCls: "text-red-600 font-semibold",
    sign:      "−",
  },
  OUTBOUND_EXPENSE: {
    badgeCls:  "bg-orange-100 text-orange-700 border-orange-200",
    icon:      ArrowUpRight,
    iconCls:   "text-orange-500",
    amountCls: "text-orange-600 font-semibold",
    sign:      "−",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function LedgerClient({
  entries,
  projects,
}: {
  entries:  LedgerEntry[];
  projects: { id: string; name: string }[];
}) {
  const { fmtAmount } = useCurrency();
  const t      = useTranslations("finance");
  const locale = useLocale();

  const dateLocale = locale === "he" ? "he-IL" : "en-US";

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(dateLocale, {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  }

  const tType = (tp: LedgerEntry["type"]) => {
    try { return t(`ledger.types.${tp}` as Parameters<typeof t>[0]); } catch { return tp; }
  };

  const [search,        setSearch]        = useState("");
  const [typeFilter,    setTypeFilter]    = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (typeFilter !== "ALL") {
        if (typeFilter === "INBOUND"  && e.type !== "INBOUND")                                          return false;
        if (typeFilter === "OUTBOUND" && e.type !== "OUTBOUND_SUPPLIER" && e.type !== "OUTBOUND_EXPENSE") return false;
      }
      if (projectFilter !== "ALL" && e.projectId !== projectFilter) return false;
      if (dateFrom && new Date(e.date) < new Date(dateFrom)) return false;
      if (dateTo   && new Date(e.date) > new Date(dateTo + "T23:59:59")) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.description.toLowerCase().includes(q) &&
          !(e.projectName  ?? "").toLowerCase().includes(q) &&
          !(e.entityLabel  ?? "").toLowerCase().includes(q) &&
          !(e.reference    ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [entries, typeFilter, projectFilter, dateFrom, dateTo, search]);

  // Totals
  const inbound  = filtered.filter(e => e.type === "INBOUND").reduce((s, e) => s + e.amount, 0);
  const outbound = filtered.filter(e => e.type !== "INBOUND").reduce((s, e) => s + e.amount, 0);
  const net      = inbound - outbound;

  const tableHeaders = [
    { key: "ledger.table.date",        align: "text-start" },
    { key: "ledger.table.type",        align: "text-start" },
    { key: "ledger.table.description", align: "text-start" },
    { key: "ledger.table.project",     align: "text-start" },
    { key: "ledger.table.reference",   align: "text-start" },
    { key: "ledger.table.amount",      align: "text-end"   },
  ] as const;

  return (
    <div className="space-y-4" dir={locale === "he" ? "rtl" : "ltr"}>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { labelKey: "ledger.summary.inbound",  value: inbound,  cls: "text-emerald-700" },
          { labelKey: "ledger.summary.outbound", value: outbound, cls: "text-red-600"     },
          { labelKey: "ledger.summary.net",      value: net,      cls: net >= 0 ? "text-blue-700" : "text-red-700" },
        ].map((s) => (
          <div key={s.labelKey} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">{t(s.labelKey as Parameters<typeof t>[0])}</p>
            <p className={`text-lg font-bold tabular-nums ${s.cls}`}>
              {net < 0 && s.labelKey === "ledger.summary.net" ? "−" : ""}
              {fmtAmount(Math.abs(s.value))}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("ledger.filters.search")}
            className="h-8 ps-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL"      className="text-xs">{t("ledger.filters.typeAll")}</SelectItem>
            <SelectItem value="INBOUND"  className="text-xs">{t("ledger.filters.typeInbound")}</SelectItem>
            <SelectItem value="OUTBOUND" className="text-xs">{t("ledger.filters.typeOutbound")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Project filter */}
        {projects.length > 0 && (
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">{t("ledger.filters.allProjects")}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date range */}
        <Input
          type="date" className="h-8 w-[130px] text-xs"
          value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          title={t("ledger.filters.fromDate")}
        />
        <Input
          type="date" className="h-8 w-[130px] text-xs"
          value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          title={t("ledger.filters.toDate")}
        />
      </div>

      {/* ── Ledger Table ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">{t("ledger.empty")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {tableHeaders.map(({ key, align }) => (
                    <th key={key} className={`font-medium text-muted-foreground px-4 py-2.5 text-xs ${align}`}>
                      {t(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((entry) => {
                  const cfg  = TYPE_CONFIG[entry.type];
                  const Icon = cfg.icon;
                  return (
                    <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(entry.date)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.iconCls}`} />
                          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 py-0 ${cfg.badgeCls}`}>
                            {tType(entry.type)}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs max-w-[220px] truncate" title={entry.description}>
                        {entry.description}
                      </td>
                      <td className="px-4 py-2.5">
                        {entry.projectName ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FolderKanban className="h-3 w-3 shrink-0" />
                            {entry.projectName}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {entry.reference ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-end tabular-nums whitespace-nowrap">
                        <span className={cfg.amountCls}>
                          {cfg.sign}{fmtAmount(entry.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-muted/20 border-t border-border text-xs text-muted-foreground">
            {t("ledger.entryCount", { count: filtered.length })}
          </div>
        </div>
      )}
    </div>
  );
}
