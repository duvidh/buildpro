"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  FileText,
  Loader2,
  Trash2,
  MoreHorizontal,
  ChevronRight,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";
import { createQuote, deleteQuote } from "@/actions/quotes";

// ─── Types ────────────────────────────────────────────────────────────────────

type Quote = {
  id: string;
  quoteNumber: string | null;
  date: Date | string;
  validUntil: Date | string | null;
  status: string;
  total: number;
  client: { id: string; name: string } | null;
  lead: { id: string; name: string } | null;
  _count: { items: number };
};

type Client = { id: string; name: string };
type Lead = { id: string; name: string };

type Props = {
  quotes: Quote[];
  clients: Client[];
  leads: Lead[];
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "טיוטה",
  SENT: "נשלחה",
  ACCEPTED: "אושרה",
  REJECTED: "נדחתה",
  EXPIRED: "פגת תוקף",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  SENT: "outline",
  ACCEPTED: "default",
  REJECTED: "destructive",
  EXPIRED: "secondary",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ─── New quote dialog ─────────────────────────────────────────────────────────

function NewQuoteDialog({ clients, leads }: { clients: Client[]; leads: Lead[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"client" | "lead">("client");
  const [clientId, setClientId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [error, setError] = useState("");

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));
  const leadOptions = leads.map((l) => ({ value: l.id, label: l.name }));

  function handleOpen(val: boolean) {
    setOpen(val);
    if (!val) {
      setClientId("");
      setLeadId("");
      setError("");
    }
  }

  function submit() {
    if (mode === "client" && !clientId) { setError("בחר לקוח"); return; }
    if (mode === "lead" && !leadId) { setError("בחר ליד"); return; }
    setError("");
    startTransition(async () => {
      const res = await createQuote(mode === "client" ? { clientId } : { leadId });
      if (res.success) {
        handleOpen(false);
        router.push(`/quotes/${res.quoteId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          הצעת מחיר חדשה
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>הצעת מחיר חדשה</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => { setMode("client"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                mode === "client"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              לקוח
            </button>
            <button
              type="button"
              onClick={() => { setMode("lead"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                mode === "lead"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              ליד
            </button>
          </div>

          {/* Selection */}
          <div className="flex flex-col gap-1.5">
            {mode === "client" ? (
              <>
                <Label>לקוח *</Label>
                <Combobox
                  options={clientOptions}
                  value={clientId}
                  onValueChange={(v) => { setClientId(v); setError(""); }}
                  placeholder="בחר לקוח..."
                  searchPlaceholder="חיפוש לקוח..."
                  emptyText="לא נמצאו לקוחות"
                />
              </>
            ) : (
              <>
                <Label>ליד *</Label>
                <Combobox
                  options={leadOptions}
                  value={leadId}
                  onValueChange={(v) => { setLeadId(v); setError(""); }}
                  placeholder="בחר ליד..."
                  searchPlaceholder="חיפוש ליד..."
                  emptyText="לא נמצאו לידים"
                />
              </>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <Button onClick={submit} disabled={isPending} className="self-end">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "צור הצעה"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function QuotesContent({ quotes, clients, leads }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteQuote(id);
      router.refresh();
    });
  }

  function fmtDate(d: Date | string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("he-IL");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">הצעות מחיר</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{quotes.length} הצעות</p>
        </div>
        <NewQuoteDialog clients={clients} leads={leads} />
      </div>

      {/* Empty state */}
      {quotes.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center text-muted-foreground">
          <FileText className="h-12 w-12 opacity-30" />
          <p className="text-sm">אין הצעות מחיר עדיין</p>
          <NewQuoteDialog clients={clients} leads={leads} />
        </div>
      )}

      {/* Table */}
      {quotes.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>מספר הצעה</TableHead>
                <TableHead>לקוח / ליד</TableHead>
                <TableHead className="hidden sm:table-cell">תאריך</TableHead>
                <TableHead className="hidden md:table-cell">בתוקף עד</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead className="hidden sm:table-cell text-center">פריטים</TableHead>
                <TableHead className="text-start">סכום כולל</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => {
                const entityName = q.client?.name ?? q.lead?.name ?? "—";
                const isLead = !q.client && !!q.lead;
                return (
                  <TableRow
                    key={q.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => router.push(`/quotes/${q.id}`)}
                  >
                    <TableCell className="font-mono font-medium text-sm">
                      {q.quoteNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {isLead && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                            ליד
                          </Badge>
                        )}
                        {entityName}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">{fmtDate(q.date)}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{fmtDate(q.validUntil)}</TableCell>
                    <TableCell>
                      <StatusBadge status={q.status} />
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground hidden sm:table-cell">
                      {q._count.items}
                    </TableCell>
                    <TableCell className="font-medium">
                      {q.total > 0
                        ? `₪${q.total.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`
                        : "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/quotes/${q.id}`}>
                              <ChevronRight className="h-4 w-4 ms-1" />
                              פתח הצעה
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(q.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4 ms-1" />
                            מחק
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
