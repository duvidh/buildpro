"use client";

import { useCurrency } from "@/lib/currency-context";
import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MoreHorizontal, PhoneCall, Loader2, Trash2, Users,
  ArrowUpDown, ArrowUp, ArrowDown, Search, X, ExternalLink,
} from "lucide-react";

// ─── WhatsApp helpers ─────────────────────────────────────────────────────────

function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

import { toast } from "sonner";
import type { LeadStatusValue } from "@/components/leads/lead-status-badge";
import { updateLeadStatus, deleteLead } from "@/actions/leads";
import { LEAD_STATUS_VALUES } from "@/lib/constants/lead-enums";
import { LeadStatusBadge } from "./lead-status-badge";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmployeeOption = { id: string; name: string };

type Lead = {
  id:                 string;
  name:               string;
  phone:              string;
  phone2:             string | null;
  email:              string | null;
  propertyAddress:    string | null;
  city:               string | null;
  estimatedSize:      number | null;
  constructionTypes:  string[];
  source:             string;
  status:             LeadStatusValue;
  urgency:            string;
  budget:             number | null;
  notes:              string | null;
  convertedToId:      string | null;
  assignedEmployeeId: string | null;
  assignedEmployee:   { id: string; name: string } | null;
  createdAt:          string;
};

type SortKey = "name" | "status" | "budget";

const STATUS_ORDER: Record<string, number> = {
  NEW: 0, CONTACTED: 1, MEETING_SCHEDULED: 2,
  QUOTE_SENT: 3, NEGOTIATION: 4, CONVERTED: 5, LOST: 6,
};

function compareLeads(a: Lead, b: Lead, key: SortKey, dir: "asc" | "desc"): number {
  let diff = 0;
  if (key === "name") {
    diff = a.name.localeCompare(b.name, "he");
  } else if (key === "status") {
    diff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
  } else if (key === "budget") {
    diff = (a.budget ?? -1) - (b.budget ?? -1);
  }
  return dir === "asc" ? diff : -diff;
}

// ─── Status dropdown ──────────────────────────────────────────────────────────

function StatusDropdown({ lead }: { lead: Lead }) {
  const t      = useTranslations("leads.table");
  const router = useRouter();
  const [, startTransition] = useTransition();

  function changeStatus(status: LeadStatusValue) {
    startTransition(async () => {
      await updateLeadStatus(lead.id, status);
      toast.success(t("toastStatusUpdated"));
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="cursor-pointer">
          <LeadStatusBadge status={lead.status} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("changeStatus")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LEAD_STATUS_VALUES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => changeStatus(s)}
            className={lead.status === s ? "font-semibold" : ""}
          >
            <LeadStatusBadge status={s} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Sort icon (module-level to avoid React reconciler issues) ────────────────

function SortIcon({
  field, sortKey, sortDir,
}: {
  field:   SortKey;
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
}) {
  if (sortKey !== field)
    return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />;
  return sortDir === "asc"
    ? <ArrowUp   className="h-3 w-3 text-foreground shrink-0" />
    : <ArrowDown className="h-3 w-3 text-foreground shrink-0" />;
}

// ─── Main table ───────────────────────────────────────────────────────────────

export function LeadsTable({ leads, employees }: { leads: Lead[]; employees: EmployeeOption[] }) {
  const { fmtCompact } = useCurrency();
  const t       = useTranslations("leads");
  const tCommon = useTranslations("common");
  const router  = useRouter();
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchText, setSearchText]         = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const processedLeads = useMemo(() => {
    let result = leads;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          (l.email ?? "").toLowerCase().includes(q) ||
          (l.propertyAddress ?? "").toLowerCase().includes(q)
      );
    }
    if (filterEmployeeId) {
      result = result.filter((l) => l.assignedEmployeeId === filterEmployeeId);
    }
    if (sortKey) {
      result = [...result].sort((a, b) => compareLeads(a, b, sortKey, sortDir));
    }
    return result;
  }, [leads, searchText, filterEmployeeId, sortKey, sortDir]);

  function handleConfirmDelete() {
    if (!deletingLeadId) return;
    startDeleteTransition(async () => {
      await deleteLead(deletingLeadId);
      toast.success(t("table.toastDeleted"));
      setDeletingLeadId(null);
      router.refresh();
    });
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-white/90 shadow-[0_4px_24px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground">{t("table.emptyTitle")}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">{t("table.emptyDesc")}</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Filter / Search bar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="ps-8 h-9 text-sm"
            placeholder={t("table.search")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button
              className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchText("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {employees.length > 0 && (
          <Select
            value={filterEmployeeId || "__all__"}
            onValueChange={(v) => setFilterEmployeeId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder={t("table.filterByRep")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("table.allReps")}</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(searchText || filterEmployeeId) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground gap-1"
            onClick={() => { setSearchText(""); setFilterEmployeeId(""); }}
          >
            <X className="h-3.5 w-3.5" />
            {t("table.clearFilter")}
            <span className="ms-1 font-medium text-foreground">
              ({processedLeads.length}/{leads.length})
            </span>
          </Button>
        )}
      </div>

      {processedLeads.length === 0 ? (
        <div className="rounded-xl border border-border/50 py-14 text-center text-muted-foreground text-sm">
          {t("table.noMatch")}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead
                className="w-[180px] cursor-pointer select-none"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  {t("table.col.name")}
                  <SortIcon field="name" sortKey={sortKey} sortDir={sortDir} />
                </div>
              </TableHead>
              <TableHead className="text-center">{t("table.col.phone")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("table.col.address")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("table.col.city")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("table.col.source")}</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  {t("table.col.status")}
                  <SortIcon field="status" sortKey={sortKey} sortDir={sortDir} />
                </div>
              </TableHead>
              <TableHead className="hidden xl:table-cell">{t("table.col.constructionType")}</TableHead>
              <TableHead
                className="hidden lg:table-cell cursor-pointer select-none"
                onClick={() => handleSort("budget")}
              >
                <div className="flex items-center gap-1">
                  {t("table.col.budget")}
                  <SortIcon field="budget" sortKey={sortKey} sortDir={sortDir} />
                </div>
              </TableHead>
              <TableHead className="w-28">{t("table.col.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedLeads.map((lead) => (
              <TableRow
                key={lead.id}
                className="group cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/leads/${lead.id}`)}
              >
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-2" dir="ltr">
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors"
                    >
                      <PhoneCall className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      {lead.phone}
                    </a>
                    <a
                      href={`https://wa.me/${toWhatsAppNumber(lead.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t("table.whatsapp")}
                      className="inline-flex items-center justify-center h-6 w-6 rounded text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                    >
                      <WhatsAppIcon />
                    </a>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[160px] truncate">
                  {lead.propertyAddress || "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {lead.city || "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {(() => {
                    try { return t(`source.${lead.source}` as Parameters<typeof t>[0]); }
                    catch { return lead.source; }
                  })()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <StatusDropdown lead={lead} />
                </TableCell>
                <TableCell className="hidden xl:table-cell text-sm text-muted-foreground max-w-[180px]">
                  {lead.constructionTypes?.length ? lead.constructionTypes.join(", ") : "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {lead.budget ? fmtCompact(lead.budget) : "—"}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded hover:bg-muted"
                    >
                      {t("table.open")}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeletingLeadId(lead.id)}
                        >
                          <Trash2 className="h-4 w-4 me-2" />
                          {t("table.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog
        open={!!deletingLeadId}
        onOpenChange={(open) => { if (!open) setDeletingLeadId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("table.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("table.confirmDeleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              {t("table.deleteLead")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
