"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MoreHorizontal, PhoneCall, UserCheck, Loader2, Pencil, Trash2, Users,
  ArrowUpDown, ArrowUp, ArrowDown, Search, X,
} from "lucide-react";
import { toast } from "sonner";
import { NewLeadDialog } from "@/components/leads/new-lead-dialog";
import type { LeadStatusValue } from "@/components/leads/lead-status-badge";
import {
  updateLeadStatus, convertLeadToClient, updateLead, deleteLead,
} from "@/actions/leads";
import { LEAD_STATUS_VALUES } from "@/lib/constants/lead-enums";
import { createLeadSchema, type CreateLeadInput } from "@/lib/schemas/lead-schema";
import {
  LeadStatusBadge, LeadUrgencyBadge,
  LEAD_SOURCE_LABELS, LEAD_URGENCY_CONFIG,
} from "./lead-status-badge";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmployeeOption = { id: string; name: string };

type Lead = {
  id: string;
  name: string;
  phone: string;
  phone2: string | null;
  email: string | null;
  propertyAddress: string | null;
  source: string;
  status: LeadStatusValue;
  urgency: string;
  budget: number | null;
  notes: string | null;
  convertedToId: string | null;
  assignedEmployeeId: string | null;
  assignedEmployee: { id: string; name: string } | null;
  createdAt: string;
};

type SortKey = "name" | "status" | "urgency" | "budget" | "createdAt";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(iso));
}

const URGENCY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
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
  } else if (key === "urgency") {
    diff = (URGENCY_ORDER[a.urgency] ?? 99) - (URGENCY_ORDER[b.urgency] ?? 99);
  } else if (key === "budget") {
    diff = (a.budget ?? -1) - (b.budget ?? -1);
  } else if (key === "createdAt") {
    diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }
  return dir === "asc" ? diff : -diff;
}

// ─── Status dropdown ──────────────────────────────────────────────────────────

function StatusDropdown({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  function changeStatus(status: LeadStatusValue) {
    startTransition(async () => {
      await updateLeadStatus(lead.id, status);
      toast.success("סטטוס עודכן");
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
        <DropdownMenuLabel className="text-xs text-muted-foreground">שינוי סטטוס</DropdownMenuLabel>
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

// ─── Convert button ───────────────────────────────────────────────────────────

function ConvertButton({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (lead.status === "CONVERTED" || lead.convertedToId) {
    return (
      <span className="text-xs text-emerald-600 flex items-center gap-1">
        <UserCheck className="h-3.5 w-3.5" /> לקוח
      </span>
    );
  }

  function handleConvert() {
    startTransition(async () => {
      const res = await convertLeadToClient(lead.id);
      if (res.success) {
        toast.success("הליד הומר ללקוח בהצלחה");
        router.push(`/clients/${res.clientId}`);
      } else {
        toast.error("שגיאה בהמרת הליד");
      }
    });
  }

  return (
    <Button
      variant="outline" size="sm"
      className="h-7 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
      onClick={handleConvert} disabled={isPending}
    >
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
      המר
    </Button>
  );
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function EditLeadDialog({
  lead, open, onOpenChange, employees,
}: {
  lead: Lead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: EmployeeOption[];
}) {
  const router = useRouter();
  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }));
  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      name: lead.name,
      phone: lead.phone,
      phone2: lead.phone2 ?? "",
      email: lead.email ?? "",
      propertyAddress: lead.propertyAddress ?? "",
      source: lead.source as CreateLeadInput["source"],
      urgency: lead.urgency as CreateLeadInput["urgency"],
      budget: lead.budget !== null ? String(lead.budget) : "",
      notes: lead.notes ?? "",
      assignedEmployeeId: lead.assignedEmployeeId ?? undefined,
    },
  });
  const assignedEmployeeId = watch("assignedEmployeeId");

  async function onSubmit(data: CreateLeadInput) {
    const res = await updateLead(lead.id, data);
    if (res.success) {
      toast.success("ליד עודכן בהצלחה");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error("שגיאה בעדכון הליד");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>כרטיס ליד — {lead.name}</DialogTitle>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="el-name">שם מלא <span className="text-destructive">*</span></Label>
                  <Input id="el-name" {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="el-phone">טלפון ראשי <span className="text-destructive">*</span></Label>
                  <Input id="el-phone" type="tel" dir="ltr" {...register("phone")} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="el-phone2">טלפון נוסף</Label>
                  <Input id="el-phone2" type="tel" dir="ltr" {...register("phone2")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="el-email">אימייל</Label>
                  <Input id="el-email" type="email" dir="ltr" {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="el-address">כתובת הנכס</Label>
                <Input id="el-address" {...register("propertyAddress")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>מקור ליד</Label>
                  <Select
                    defaultValue={lead.source}
                    onValueChange={(v) => setValue("source", v as CreateLeadInput["source"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEAD_SOURCE_LABELS).map(([v, label]) => (
                        <SelectItem key={v} value={v}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>דחיפות</Label>
                  <Select
                    defaultValue={lead.urgency}
                    onValueChange={(v) => setValue("urgency", v as CreateLeadInput["urgency"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEAD_URGENCY_CONFIG).map(([v, cfg]) => (
                        <SelectItem key={v} value={v}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {employeeOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label>נציג מטפל</Label>
                  <Combobox
                    options={employeeOptions}
                    value={assignedEmployeeId ?? ""}
                    onValueChange={(v) => setValue("assignedEmployeeId", v || undefined)}
                    placeholder="בחר נציג..."
                    searchPlaceholder="חיפוש עובד..."
                    emptyText="לא נמצאו עובדים"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="el-budget">תקציב משוער (₪)</Label>
                <Input id="el-budget" type="number" dir="ltr" {...register("budget")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="el-notes">הערות</Label>
                <Textarea id="el-notes" rows={3} {...register("notes")} />
              </div>

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

export function LeadsTable({ leads, employees }: { leads: Lead[]; employees: EmployeeOption[] }) {
  const router = useRouter();
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  // ── Sort state ──────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortKey }) {
    if (sortKey !== field)
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-foreground shrink-0" />
      : <ArrowDown className="h-3 w-3 text-foreground shrink-0" />;
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
      toast.success("ליד נמחק");
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
        <p className="text-base font-semibold text-foreground">אין לידים עדיין</p>
        <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-xs">
          הוסף ליד ראשון כדי להתחיל לעקוב אחר מחזור המכירות שלך.
        </p>
        <NewLeadDialog employees={employees} />
      </div>
    );
  }

  return (
    <>
      {/* ── Filter / Search bar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="ps-8 h-9 text-sm"
            placeholder="חיפוש לפי שם, טלפון..."
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

        {/* Employee filter */}
        {employees.length > 0 && (
          <Select value={filterEmployeeId} onValueChange={setFilterEmployeeId}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="סנן לפי נציג" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">כל הנציגים</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Active filter indicator */}
        {(searchText || filterEmployeeId) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground gap-1"
            onClick={() => { setSearchText(""); setFilterEmployeeId(""); }}
          >
            <X className="h-3.5 w-3.5" />
            נקה סינון
            <span className="ms-1 font-medium text-foreground">
              ({processedLeads.length}/{leads.length})
            </span>
          </Button>
        )}
      </div>

      {processedLeads.length === 0 ? (
        <div className="rounded-xl border border-border/50 py-14 text-center text-muted-foreground text-sm">
          לא נמצאו לידים התואמים את הסינון
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
                  שם <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead className="text-center">טלפון</TableHead>
              <TableHead className="hidden md:table-cell">כתובת נכס</TableHead>
              <TableHead className="hidden sm:table-cell">מקור</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("urgency")}
              >
                <div className="flex items-center gap-1">
                  דחיפות <SortIcon field="urgency" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  סטטוס <SortIcon field="status" />
                </div>
              </TableHead>
              <TableHead
                className="hidden lg:table-cell cursor-pointer select-none"
                onClick={() => handleSort("budget")}
              >
                <div className="flex items-center gap-1">
                  תקציב <SortIcon field="budget" />
                </div>
              </TableHead>
              <TableHead
                className="hidden md:table-cell cursor-pointer select-none"
                onClick={() => handleSort("createdAt")}
              >
                <div className="flex items-center gap-1">
                  תאריך <SortIcon field="createdAt" />
                </div>
              </TableHead>
              <TableHead className="w-28">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedLeads.map((lead) => (
              <TableRow
                key={lead.id}
                className="group cursor-pointer hover:bg-muted/50"
                onClick={() => setEditingLead(lead)}
              >
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`tel:${lead.phone}`}
                    className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors"
                    dir="ltr"
                  >
                    <PhoneCall className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    {lead.phone}
                  </a>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[160px] truncate">
                  {lead.propertyAddress || "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {LEAD_SOURCE_LABELS[lead.source] ?? lead.source}
                </TableCell>
                <TableCell><LeadUrgencyBadge urgency={lead.urgency} /></TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <StatusDropdown lead={lead} />
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {lead.budget ? `₪${lead.budget.toLocaleString("he-IL")}` : "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {formatDate(lead.createdAt)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5 justify-end">
                    <ConvertButton lead={lead} />
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
                        <DropdownMenuItem onClick={() => setEditingLead(lead)}>
                          <Pencil className="h-4 w-4 me-2" />
                          עריכה
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeletingLeadId(lead.id)}
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
      )}

      {editingLead && (
        <EditLeadDialog
          key={editingLead.id}
          lead={editingLead}
          open={!!editingLead}
          onOpenChange={(open) => { if (!open) setEditingLead(null); }}
          employees={employees}
        />
      )}

      <AlertDialog
        open={!!deletingLeadId}
        onOpenChange={(open) => { if (!open) setDeletingLeadId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הליד לצמיתות ואינה הפיכה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              מחק ליד
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
