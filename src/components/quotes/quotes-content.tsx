"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  Plus,
  FileText,
  Loader2,
  Trash2,
  MoreHorizontal,
  ChevronRight,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createQuote, deleteQuote } from "@/actions/quotes";
import { createQuoteSchema, type CreateQuoteInput } from "@/lib/schemas/quote-schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type Quote = {
  id: string;
  quoteNumber: string | null;
  date: Date | string;
  validUntil: Date | string | null;
  status: string;
  total: number;
  client: { id: string; name: string };
  _count: { items: number };
};

type Client = { id: string; name: string };

type Props = {
  quotes: Quote[];
  clients: Client[];
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

function NewQuoteDialog({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [clientError, setClientError] = useState("");

  const { handleSubmit, setValue, reset } = useForm<CreateQuoteInput>({
    resolver: zodResolver(createQuoteSchema),
    defaultValues: { clientId: "" },
  });

  function submit(data: CreateQuoteInput) {
    if (!data.clientId) {
      setClientError("בחר לקוח");
      return;
    }
    setClientError("");
    startTransition(async () => {
      const res = await createQuote(data);
      if (res.success) {
        setOpen(false);
        reset();
        router.push(`/quotes/${res.quoteId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label>לקוח *</Label>
            <Select
              onValueChange={(val) => {
                setValue("clientId", val);
                setClientError("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר לקוח" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clientError && <p className="text-xs text-destructive">{clientError}</p>}
          </div>
          <Button type="submit" disabled={isPending} className="self-end">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "צור הצעה"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function QuotesContent({ quotes, clients }: Props) {
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
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">הצעות מחיר</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{quotes.length} הצעות</p>
        </div>
        <NewQuoteDialog clients={clients} />
      </div>

      {/* Empty state */}
      {quotes.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center text-muted-foreground">
          <FileText className="h-12 w-12 opacity-30" />
          <p className="text-sm">אין הצעות מחיר עדיין</p>
          <NewQuoteDialog clients={clients} />
        </div>
      )}

      {/* Table */}
      {quotes.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>מספר הצעה</TableHead>
                <TableHead>לקוח</TableHead>
                <TableHead>תאריך</TableHead>
                <TableHead>בתוקף עד</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead className="text-center">פריטים</TableHead>
                <TableHead className="text-start">סכום כולל</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow
                  key={q.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => router.push(`/quotes/${q.id}`)}
                >
                  <TableCell className="font-mono font-medium text-sm">
                    {q.quoteNumber ?? "—"}
                  </TableCell>
                  <TableCell>{q.client.name}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(q.date)}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(q.validUntil)}</TableCell>
                  <TableCell>
                    <StatusBadge status={q.status} />
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
