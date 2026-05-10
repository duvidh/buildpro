"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Plus, Star, Phone, Mail, Package,
  MoreHorizontal, Pencil, Trash2, Loader2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  createSubcontractor,
  updateSubcontractor,
  deleteSubcontractor,
} from "@/actions/subcontractors";

type Supplier = {
  id: string;
  name: string;
  type: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  rating: number | null;
  active: boolean;
  notes: string | null;
  _count: { contracts: number };
};

type Props = { initial: Supplier[] };

const TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  SUBCONTRACTOR: { label: "קבלן משנה", cls: "bg-violet-100 text-violet-700 border-violet-200" },
  SUPPLIER:      { label: "ספק",       cls: "bg-blue-100 text-blue-700 border-blue-200" },
};

const FILTER_OPTS = [
  { value: "ALL",           label: "הכל" },
  { value: "SUBCONTRACTOR", label: "קבלני משנה" },
  { value: "SUPPLIER",      label: "ספקים" },
];

function StarRating({ rating }: { rating: number | null }) {
  const r = rating ?? 0;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= r ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  type: "SUBCONTRACTOR",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

function EditSupplierDialog({
  supplier,
  open,
  onOpenChange,
  onSaved,
}: {
  supplier: Supplier;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (patch: Partial<Supplier>) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: supplier.name,
    type: supplier.type,
    contactName: supplier.contactName ?? "",
    phone: supplier.phone ?? "",
    email: supplier.email ?? "",
    address: supplier.address ?? "",
    notes: supplier.notes ?? "",
  });

  function handleSave() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      const res = await updateSubcontractor(supplier.id, {
        name: form.name.trim(),
        type: form.type,
        contactName: form.contactName || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
      });
      if (res.success) {
        toast.success(`${form.type === "SUBCONTRACTOR" ? "קבלן המשנה" : "הספק"} עודכן בהצלחה`);
        onSaved({
          name: form.name.trim(),
          type: form.type,
          contactName: form.contactName || null,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          notes: form.notes || null,
        });
        onOpenChange(false);
      } else {
        toast.error("שגיאה בעדכון");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>עריכת ספק / קבלן — {supplier.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>סוג *</Label>
            <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SUBCONTRACTOR">קבלן משנה</SelectItem>
                <SelectItem value="SUPPLIER">ספק</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>שם החברה / עצמאי *</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>איש קשר</Label>
              <Input value={form.contactName} onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>טלפון</Label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>דוא״ל</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>כתובת</Label>
            <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>הערות</Label>
            <Textarea className="resize-none" rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button disabled={!form.name.trim() || isPending} onClick={handleSave}>
              {isPending && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              שמור שינויים
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SubcontractorsManager({ initial }: Props) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleSubmit() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      const res = await createSubcontractor({
        name: form.name.trim(),
        type: form.type,
        contactName: form.contactName || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
      });
      if (res.success) {
        toast.success(`${form.type === "SUBCONTRACTOR" ? "קבלן המשנה" : "הספק"} נוסף בהצלחה`);
        const newItem: Supplier = {
          id: crypto.randomUUID(),
          name: form.name.trim(),
          type: form.type,
          contactName: form.contactName || null,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          rating: null,
          active: true,
          notes: form.notes || null,
          _count: { contracts: 0 },
        };
        setItems((prev) => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name, "he")));
        setForm(EMPTY_FORM);
        setOpen(false);
      } else {
        toast.error("שגיאה בהוספה");
      }
    });
  }

  function handleConfirmDelete() {
    if (!deletingId) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const res = await deleteSubcontractor(deletingId);
      if (res.success) {
        toast.success("הרשומה נמחקה בהצלחה");
        setItems((prev) => prev.filter((s) => s.id !== deletingId));
        setDeletingId(null);
      } else {
        setDeleteError(res.error ?? "שגיאה במחיקה");
        toast.error(res.error ?? "לא ניתן למחוק רשומה זו");
      }
    });
  }

  const visible = items.filter((s) => {
    const matchType = filter === "ALL" || s.type === filter;
    const matchSearch =
      !search ||
      s.name.includes(search) ||
      s.contactName?.includes(search) ||
      s.phone?.includes(search);
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="חיפוש לפי שם, איש קשר, טלפון..."
          className="max-w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1">
          {FILTER_OPTS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="ms-auto">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 me-1.5" />
                הוסף ספק / קבלן
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>הוספת ספק / קבלן משנה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label>סוג *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUBCONTRACTOR">קבלן משנה</SelectItem>
                      <SelectItem value="SUPPLIER">ספק</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>שם החברה / עצמאי *</Label>
                  <Input placeholder="שם הספק..." value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>איש קשר</Label>
                    <Input placeholder="שם מלא" value={form.contactName} onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>טלפון</Label>
                    <Input placeholder="05X-XXXXXXX" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>דוא״ל</Label>
                  <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>כתובת</Label>
                  <Input placeholder="רחוב, עיר" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>הערות</Label>
                  <Textarea placeholder="התמחות, תנאי תשלום..." className="resize-none" rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <Button className="w-full" disabled={!form.name.trim() || isPending} onClick={handleSubmit}>
                  {isPending ? "שומר..." : "הוסף"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        מציג {visible.length} מתוך {items.length} רשומות
      </p>

      {/* Table */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">לא נמצאו ספקים או קבלני משנה</p>
          <p className="text-xs text-muted-foreground mt-1">לחץ על "הוסף ספק / קבלן" להתחיל</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-start px-4 py-3 font-medium text-muted-foreground text-xs">שם</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground text-xs">סוג</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground text-xs">איש קשר</th>
                <th className="text-start px-4 py-3 font-medium text-muted-foreground text-xs">פרטי קשר</th>
                <th className="text-end px-4 py-3 font-medium text-muted-foreground text-xs">דירוג</th>
                <th className="text-end px-4 py-3 font-medium text-muted-foreground text-xs">חוזים</th>
                <th className="text-end px-4 py-3 font-medium text-muted-foreground text-xs">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {s.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{s.name}</p>
                        {s.address && <p className="text-xs text-muted-foreground truncate">{s.address}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${TYPE_LABEL[s.type]?.cls ?? ""}`}>
                      {TYPE_LABEL[s.type]?.label ?? s.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.contactName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {s.phone && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          {s.phone}
                        </span>
                      )}
                      {s.email && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground truncate max-w-[160px]">
                          <Mail className="h-3 w-3 shrink-0" />
                          {s.email}
                        </span>
                      )}
                      {!s.phone && !s.email && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <StarRating rating={s.rating} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {s._count.contracts}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingItem(s)}>
                            <Pencil className="h-4 w-4 me-2" />
                            עריכה
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => { setDeleteError(null); setDeletingId(s.id); }}
                          >
                            <Trash2 className="h-4 w-4 me-2" />
                            מחיקה
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit dialog */}
      {editingItem && (
        <EditSupplierDialog
          key={editingItem.id}
          supplier={editingItem}
          open={!!editingItem}
          onOpenChange={(v) => { if (!v) setEditingItem(null); }}
          onSaved={(patch) => {
            setItems((prev) =>
              prev.map((s) => (s.id === editingItem.id ? { ...s, ...patch } : s))
            );
            setEditingItem(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(v) => { if (!v) { setDeletingId(null); setDeleteError(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הרשומה לצמיתות.
              לא ניתן למחוק ספק שיש לו חוזים משויכים.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive px-1">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
