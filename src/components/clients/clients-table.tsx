"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PhoneCall, ExternalLink, MoreHorizontal, Pencil, Trash2, Loader2, Building2,
  ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { updateClient, deleteClient } from "@/actions/clients";
import { clientSchema, type ClientInput } from "@/lib/schemas/client-schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  phone2: string | null;
  address: string | null;
  companyNumber: string | null;
  notes: string | null;
  createdAt: string;
  _count: { projects: number; invoices: number };
  projects: { contractValue: number; status: string }[];
  invoices: { total: number; paidAmount: number }[];
};

type EnrichedClient = Client & {
  totalContract: number;
  balance: number;
  activeProjects: number;
};

type SortKey = "name" | "createdAt" | "totalContract" | "balance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.trim().split(" ").slice(0, 2).map((w) => w[0]).join("");
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(iso));
}

function enrichClient(c: Client): EnrichedClient {
  const totalContract = c.projects.reduce((s, p) => s + p.contractValue, 0);
  const totalInvoiced = c.invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = c.invoices.reduce((s, i) => s + i.paidAmount, 0);
  const balance = totalInvoiced - totalPaid;
  const activeProjects = c.projects.filter(
    (p) => p.status === "ACTIVE" || p.status === "PLANNING"
  ).length;
  return { ...c, totalContract, balance, activeProjects };
}

function compareClients(a: EnrichedClient, b: EnrichedClient, key: SortKey, dir: "asc" | "desc") {
  let diff = 0;
  if (key === "name") diff = a.name.localeCompare(b.name, "he");
  else if (key === "createdAt") diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  else if (key === "totalContract") diff = a.totalContract - b.totalContract;
  else if (key === "balance") diff = a.balance - b.balance;
  return dir === "asc" ? diff : -diff;
}

// ─── SortIcon ─────────────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: "asc" | "desc" }) {
  if (sortKey !== col) return <ArrowUpDown className="h-3.5 w-3.5 ms-1 opacity-40" />;
  return sortDir === "asc"
    ? <ArrowUp className="h-3.5 w-3.5 ms-1 text-primary" />
    : <ArrowDown className="h-3.5 w-3.5 ms-1 text-primary" />;
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function EditClientDialog({
  client, open, onOpenChange,
}: {
  client: Client;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client.name,
      contactName: client.contactName ?? "",
      phone: client.phone ?? "",
      phone2: client.phone2 ?? "",
      email: client.email ?? "",
      address: client.address ?? "",
      companyNumber: client.companyNumber ?? "",
      notes: client.notes ?? "",
    },
  });

  async function onSubmit(data: ClientInput) {
    setServerError(null);
    const res = await updateClient(client.id, data);
    if (res.success) {
      toast.success("לקוח עודכן בהצלחה");
      onOpenChange(false);
      router.refresh();
    } else {
      setServerError(res.error);
      toast.error(res.error ?? "שגיאה בעדכון הלקוח");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>כרטיס לקוח — {client.name}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="details" dir="rtl">
          <TabsList
            variant="line"
            className="w-full justify-start border-b border-border rounded-none pb-0 mb-4"
          >
            <TabsTrigger value="details">פרטים אישיים</TabsTrigger>
            <TabsTrigger value="activity">יומן פעילות</TabsTrigger>
            <TabsTrigger value="tasks">משימות</TabsTrigger>
            <TabsTrigger value="docs">מסמכים</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ec-name">שם לקוח <span className="text-destructive">*</span></Label>
                <Input id="ec-name" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ec-contact">שם איש קשר</Label>
                  <Input id="ec-contact" {...register("contactName")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ec-company">ח.פ / ת.ז</Label>
                  <Input id="ec-company" dir="ltr" {...register("companyNumber")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ec-phone">טלפון ראשי</Label>
                  <Input id="ec-phone" type="tel" dir="ltr" {...register("phone")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ec-phone2">טלפון נוסף</Label>
                  <Input id="ec-phone2" type="tel" dir="ltr" {...register("phone2")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ec-email">דוא"ל</Label>
                <Input id="ec-email" type="email" dir="ltr" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ec-address">כתובת</Label>
                <Input id="ec-address" {...register("address")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ec-notes">הערות</Label>
                <Textarea id="ec-notes" rows={3} {...register("notes")} />
              </div>

              {serverError && <p className="text-sm text-destructive">{serverError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  ביטול
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
                  שמור שינויים
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="activity">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-foreground">יומן פעילות</p>
              <p className="text-xs text-muted-foreground mt-1">יתווסף בקרוב</p>
            </div>
          </TabsContent>

          <TabsContent value="tasks">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-foreground">משימות</p>
              <p className="text-xs text-muted-foreground mt-1">יתווספו בקרוב</p>
            </div>
          </TabsContent>

          <TabsContent value="docs">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-foreground">מסמכים</p>
              <p className="text-xs text-muted-foreground mt-1">יתווספו בקרוב</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────

export function ClientsTable({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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
        toast.success("לקוח נמחק");
        setDeletingClientId(null);
        router.refresh();
      } else {
        setDeleteError(res.error);
        toast.error(res.error ?? "לא ניתן למחוק לקוח זה");
      }
    });
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-white/90 shadow-[0_4px_24px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <Building2 className="h-7 w-7 text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground">אין לקוחות עדיין</p>
        <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-xs">
          לקוחות נוצרים על ידי המרת ליד. עבור ללידים והמר ליד ללקוח.
        </p>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          עבור ללידים
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
                לקוח
                <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead>טלפון</TableHead>
            <TableHead className="hidden sm:table-cell">דוא"ל</TableHead>
            <TableHead className="hidden md:table-cell text-center">פרויקטים</TableHead>
            <TableHead className="hidden lg:table-cell">
              <button
                onClick={() => handleSort("totalContract")}
                className="flex items-center text-xs font-medium hover:text-foreground transition-colors"
              >
                ערך חוזים
                <SortIcon col="totalContract" sortKey={sortKey} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="hidden lg:table-cell">
              <button
                onClick={() => handleSort("balance")}
                className="flex items-center text-xs font-medium hover:text-foreground transition-colors"
              >
                חוב פתוח
                <SortIcon col="balance" sortKey={sortKey} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="hidden md:table-cell">
              <button
                onClick={() => handleSort("createdAt")}
                className="flex items-center text-xs font-medium hover:text-foreground transition-colors"
              >
                נוסף
                <SortIcon col="createdAt" sortKey={sortKey} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="w-20">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processedClients.map((client) => (
            <TableRow
              key={client.id}
              className="group cursor-pointer hover:bg-muted/50"
              onClick={() => setEditingClient(client)}
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
                  {client.activeProjects} פעיל
                  {client._count.projects > client.activeProjects && (
                    <span className="text-muted-foreground ms-1">/ {client._count.projects}</span>
                  )}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm font-medium">
                {client.totalContract > 0
                  ? `₪${client.totalContract.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`
                  : "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {client.balance > 0 ? (
                  <span className="text-sm font-medium text-orange-600">
                    ₪{client.balance.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                  </span>
                ) : (
                  <span className="text-sm text-emerald-600">מסולק</span>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {formatDate(client.createdAt)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1 justify-end">
                  <Link
                    href={`/clients/${client.id}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
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
                      <DropdownMenuItem onClick={() => setEditingClient(client)}>
                        <Pencil className="h-4 w-4 me-2" />
                        עריכה
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => { setDeleteError(null); setDeletingClientId(client.id); }}
                      >
                        <Trash2 className="h-4 w-4 me-2" />
                        מחיקה
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingClient && (
        <EditClientDialog
          key={editingClient.id}
          client={editingClient}
          open={!!editingClient}
          onOpenChange={(open) => { if (!open) setEditingClient(null); }}
        />
      )}

      <AlertDialog
        open={!!deletingClientId}
        onOpenChange={(open) => { if (!open) { setDeletingClientId(null); setDeleteError(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הלקוח לצמיתות ואינה הפיכה.
              לא ניתן למחוק לקוח שיש לו פרויקטים או חשבוניות.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive px-1">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              מחק לקוח
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
