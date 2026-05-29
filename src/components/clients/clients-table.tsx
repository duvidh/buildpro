"use client";

import { useCurrency } from "@/lib/currency-context";
import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PhoneCall, MoreHorizontal, Pencil, Trash2, Loader2, Building2,
  ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { deleteClient } from "@/actions/clients";

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = {
  id:            string;
  name:          string;
  contactName:   string | null;
  email:         string | null;
  phone:         string | null;
  phone2:        string | null;
  address:       string | null;
  companyNumber: string | null;
  notes:         string | null;
  createdAt:     string;
  _count:   { projects: number; invoices: number };
  projects: { contractValue: number; status: string }[];
  invoices: { total: number; paidAmount: number }[];
};

type EnrichedClient = Client & {
  totalContract:  number;
  balance:        number;
  activeProjects: number;
};

type SortKey = "name" | "createdAt" | "totalContract" | "balance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.trim().split(" ").slice(0, 2).map((w) => w[0]).join("");
}

function enrichClient(c: Client): EnrichedClient {
  const totalContract = c.projects.reduce((s, p) => s + p.contractValue, 0);
  const totalInvoiced = c.invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid     = c.invoices.reduce((s, i) => s + i.paidAmount, 0);
  const balance       = totalInvoiced - totalPaid;
  const activeProjects = c.projects.filter(
    (p) => p.status === "ACTIVE" || p.status === "PLANNING"
  ).length;
  return { ...c, totalContract, balance, activeProjects };
}

function compareClients(a: EnrichedClient, b: EnrichedClient, key: SortKey, dir: "asc" | "desc") {
  let diff = 0;
  if (key === "name")          diff = a.name.localeCompare(b.name, "he");
  else if (key === "createdAt")      diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  else if (key === "totalContract")  diff = a.totalContract - b.totalContract;
  else if (key === "balance")        diff = a.balance - b.balance;
  return dir === "asc" ? diff : -diff;
}

// ─── SortIcon ─────────────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: "asc" | "desc" }) {
  if (sortKey !== col) return <ArrowUpDown className="h-3.5 w-3.5 ms-1 opacity-40" />;
  return sortDir === "asc"
    ? <ArrowUp   className="h-3.5 w-3.5 ms-1 text-primary" />
    : <ArrowDown className="h-3.5 w-3.5 ms-1 text-primary" />;
}

// ─── Main table ───────────────────────────────────────────────────────────────

export function ClientsTable({ clients }: { clients: Client[] }) {
  const { fmtCompact } = useCurrency();
  const t       = useTranslations("clients");
  const tCommon = useTranslations("common");
  const locale  = useLocale();
  const router  = useRouter();

  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [deleteError, setDeleteError]           = useState<string | null>(null);
  const [isDeleting, startDeleteTransition]     = useTransition();

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const dateLocale = locale === "he" ? "he-IL" : "en-US";
  function formatDate(iso: string) {
    return new Intl.DateTimeFormat(dateLocale, {
      day: "2-digit", month: "2-digit", year: "numeric",
    }).format(new Date(iso));
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const processedClients = useMemo<EnrichedClient[]>(() => {
    const enriched = clients.map(enrichClient);
    if (!sortKey) return enriched;
    return [...enriched].sort((a, b) => compareClients(a, b, sortKey, sortDir));
  }, [clients, sortKey, sortDir]);

  function handleConfirmDelete() {
    if (!deletingClientId) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const res = await deleteClient(deletingClientId);
      if (res.success) {
        toast.success(t("table.toastDeleted"));
        setDeletingClientId(null);
        router.refresh();
      } else {
        setDeleteError(res.error ?? null);
        toast.error(res.error ?? t("table.toastDeleteError"));
      }
    });
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-white/90 shadow-[0_4px_24px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <Building2 className="h-7 w-7 text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground">{t("table.emptyTitle")}</p>
        <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-xs">{t("table.emptyDesc")}</p>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t("table.goToLeads")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[220px]">
              <button
                onClick={() => handleSort("name")}
                className="flex items-center text-xs font-medium hover:text-foreground transition-colors"
              >
                {t("table.col.client")}
                <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead>{t("table.col.phone")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("table.col.email")}</TableHead>
            <TableHead className="hidden md:table-cell text-center">{t("table.col.projects")}</TableHead>
            <TableHead className="hidden lg:table-cell">
              <button
                onClick={() => handleSort("totalContract")}
                className="flex items-center text-xs font-medium hover:text-foreground transition-colors"
              >
                {t("table.col.contractValue")}
                <SortIcon col="totalContract" sortKey={sortKey} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="hidden lg:table-cell">
              <button
                onClick={() => handleSort("balance")}
                className="flex items-center text-xs font-medium hover:text-foreground transition-colors"
              >
                {t("table.col.openBalance")}
                <SortIcon col="balance" sortKey={sortKey} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="hidden md:table-cell">
              <button
                onClick={() => handleSort("createdAt")}
                className="flex items-center text-xs font-medium hover:text-foreground transition-colors"
              >
                {t("table.col.added")}
                <SortIcon col="createdAt" sortKey={sortKey} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {processedClients.map((client) => (
            <TableRow
              key={client.id}
              className="group cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/clients/${client.id}`)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {getInitials(client.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                    {client.contactName && (
                      <p className="text-xs text-muted-foreground truncate">{client.contactName}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                {client.phone ? (
                  <a
                    href={`tel:${client.phone}`}
                    className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors"
                    dir="ltr"
                  >
                    <PhoneCall className="h-3.5 w-3.5 opacity-60 shrink-0" />
                    {client.phone}
                  </a>
                ) : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground truncate max-w-[160px]">
                {client.email || "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell text-center">
                <Badge variant="outline" className="text-xs">
                  {client.activeProjects} {t("table.active")}
                  {client._count.projects > client.activeProjects && (
                    <span className="text-muted-foreground ms-1">/ {client._count.projects}</span>
                  )}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm font-medium">
                {client.totalContract > 0
                  ? fmtCompact(client.totalContract)
                  : "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {client.balance > 0 ? (
                  <span className="text-sm font-medium text-orange-600">
                    {fmtCompact(client.balance)}
                  </span>
                ) : (
                  <span className="text-sm text-emerald-600">{t("table.settled")}</span>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {formatDate(client.createdAt)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
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
                    <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)}>
                      <Pencil className="h-4 w-4 me-2" />
                      {t("table.openEdit")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => { setDeleteError(null); setDeletingClientId(client.id); }}
                    >
                      <Trash2 className="h-4 w-4 me-2" />
                      {t("table.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingClientId}
        onOpenChange={(open) => { if (!open) { setDeletingClientId(null); setDeleteError(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("table.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("table.confirmDeleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive px-1">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              {t("table.deleteClient")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
