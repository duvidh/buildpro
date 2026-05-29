"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Config (className only — labels from translations) ───────────────────────

const TYPE_CLASS: Record<string, string> = {
  SUBCONTRACTOR: "bg-violet-100 text-violet-700 border-violet-200",
  SUPPLIER:      "bg-blue-100 text-blue-700 border-blue-200",
};

// ─── Star Rating ──────────────────────────────────────────────────────────────

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
  const t      = useTranslations("subcontractors");
  const tCommon = useTranslations("common");
  const locale  = useLocale();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name:        supplier.name,
    type:        supplier.type,
    contactName: supplier.contactName ?? "",
    phone:       supplier.phone       ?? "",
    email:       supplier.email       ?? "",
    address:     supplier.address     ?? "",
    notes:       supplier.notes       ?? "",
  });

  const tType = (tp: string) => {
    try { return t(`type.${tp}` as Parameters<typeof t>[0]); } catch { return tp; }
  };

  function handleSave() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      const res = await updateSubcontractor(supplier.id, {
        name:        form.name.trim(),
        type:        form.type,
        contactName: form.contactName || undefined,
        phone:       form.phone       || undefined,
        email:       form.email       || undefined,
        address:     form.address     || undefined,
        notes:       form.notes       || undefined,
      });
      if (res.success) {
        toast.success(t("toast.updateSuccess"));
        onSaved({
          name:        form.name.trim(),
          type:        form.type,
          contactName: form.contactName || null,
          phone:       form.phone       || null,
          email:       form.email       || null,
          address:     form.address     || null,
          notes:       form.notes       || null,
        });
        onOpenChange(false);
      } else {
        toast.error(t("toast.updateError"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={locale === "he" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{t("form.editTitle", { name: supplier.name })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>{t("form.typeFld")}</Label>
            <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SUBCONTRACTOR">{tType("SUBCONTRACTOR")}</SelectItem>
                <SelectItem value="SUPPLIER">{tType("SUPPLIER")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("form.companyName")}</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("form.contact")}</Label>
              <Input placeholder={t("form.contactPlaceholder")} value={form.contactName} onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("form.phone")}</Label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("form.email")}</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("form.address")}</Label>
            <Input placeholder={t("form.addressPlaceholder")} value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("form.notes")}</Label>
            <Textarea className="resize-none" rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
            <Button disabled={!form.name.trim() || isPending} onClick={handleSave}>
              {isPending && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              {t("form.saveBtn")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SubcontractorsManager({ initial }: Props) {
  const t       = useTranslations("subcontractors");
  const tCommon = useTranslations("common");
  const locale  = useLocale();

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

  const tType = (tp: string) => {
    try { return t(`type.${tp}` as Parameters<typeof t>[0]); } catch { return tp; }
  };
  const tFilter = (f: string) => {
    try { return t(`filter.${f}` as Parameters<typeof t>[0]); } catch { return f; }
  };

  const FILTER_KEYS = ["ALL", "SUBCONTRACTOR", "SUPPLIER"] as const;

  function handleSubmit() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      const res = await createSubcontractor({
        name:        form.name.trim(),
        type:        form.type,
        contactName: form.contactName || undefined,
        phone:       form.phone       || undefined,
        email:       form.email       || undefined,
        address:     form.address     || undefined,
        notes:       form.notes       || undefined,
      });
      if (res.success) {
        toast.success(t("toast.addSuccess"));
        const newItem: Supplier = {
          id:          crypto.randomUUID(),
          name:        form.name.trim(),
          type:        form.type,
          contactName: form.contactName || null,
          phone:       form.phone       || null,
          email:       form.email       || null,
          address:     form.address     || null,
          rating:      null,
          active:      true,
          notes:       form.notes       || null,
          _count:      { contracts: 0 },
        };
        setItems((prev) => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name, locale)));
        setForm(EMPTY_FORM);
        setOpen(false);
      } else {
        toast.error(t("toast.addError"));
      }
    });
  }

  function handleConfirmDelete() {
    if (!deletingId) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const res = await deleteSubcontractor(deletingId);
      if (res.success) {
        toast.success(t("toast.deleteSuccess"));
        setItems((prev) => prev.filter((s) => s.id !== deletingId));
        setDeletingId(null);
      } else {
        const errMsg = res.error ?? t("toast.addError");
        setDeleteError(errMsg);
        toast.error(errMsg);
      }
    });
  }

  const visible = items.filter((s) => {
    const matchType   = filter === "ALL" || s.type === filter;
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
          placeholder={t("searchPlaceholder")}
          className="max-w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1">
          {FILTER_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {tFilter(key)}
            </button>
          ))}
        </div>
        <div className="ms-auto">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 me-1.5" />
                {t("add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" dir={locale === "he" ? "rtl" : "ltr"}>
              <DialogHeader>
                <DialogTitle>{t("form.addTitle")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label>{t("form.typeFld")}</Label>
                  <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUBCONTRACTOR">{tType("SUBCONTRACTOR")}</SelectItem>
                      <SelectItem value="SUPPLIER">{tType("SUPPLIER")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.companyName")}</Label>
                  <Input placeholder={t("form.namePlaceholder")} value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("form.contact")}</Label>
                    <Input placeholder={t("form.contactPlaceholder")} value={form.contactName} onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("form.phone")}</Label>
                    <Input placeholder="05X-XXXXXXX" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.email")}</Label>
                  <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.address")}</Label>
                  <Input placeholder={t("form.addressPlaceholder")} value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.notes")}</Label>
                  <Textarea placeholder={t("form.notesPlaceholder")} className="resize-none" rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <Button className="w-full" disabled={!form.name.trim() || isPending} onClick={handleSubmit}>
                  {isPending ? <Loader2 className="h-4 w-4 me-1.5 animate-spin" /> : null}
                  {isPending ? t("form.saveBtn") : t("form.addBtn")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {t("count", { visible: visible.length, total: items.length })}
      </p>

      {/* Table */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">{t("empty.title")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("empty.hint")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground text-xs">{t("table.name")}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground text-xs">{t("table.type")}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground text-xs">{t("table.contact")}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground text-xs">{t("table.contactInfo")}</th>
                  <th className="text-end px-4 py-3 font-medium text-muted-foreground text-xs">{t("table.rating")}</th>
                  <th className="text-end px-4 py-3 font-medium text-muted-foreground text-xs">{t("table.contracts")}</th>
                  <th className="text-end px-4 py-3 font-medium text-muted-foreground text-xs">{t("table.actions")}</th>
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
                      <Badge variant="outline" className={`text-xs ${TYPE_CLASS[s.type] ?? ""}`}>
                        {tType(s.type)}
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
                              {t("actions.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => { setDeleteError(null); setDeletingId(s.id); }}
                            >
                              <Trash2 className="h-4 w-4 me-2" />
                              {t("actions.delete")}
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
        <AlertDialogContent dir={locale === "he" ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("delete.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive px-1">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
