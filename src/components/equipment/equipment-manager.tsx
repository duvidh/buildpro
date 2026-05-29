"use client";

import { useCurrency } from "@/lib/currency-context";
import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Plus, Wrench, FolderKanban, X, MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createEquipment,
  assignEquipmentToProject,
  unassignEquipment,
  deleteEquipment,
} from "@/actions/equipment";

type EquipmentItem = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  value: number | null;
  purchaseDate: Date | null;
  notes: string | null;
  logs: {
    id: string;
    checkOutDate: Date;
    project: { id: string; name: string };
  }[];
};

type Project = { id: string; name: string };

// className-only status config — labels come from translations
const STATUS_CLASS: Record<string, string> = {
  AVAILABLE:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  IN_USE:      "bg-blue-100 text-blue-700 border-blue-200",
  MAINTENANCE: "bg-orange-100 text-orange-700 border-orange-200",
  RETIRED:     "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_FILTER_KEYS = ["ALL", "AVAILABLE", "IN_USE", "MAINTENANCE"] as const;

const EMPTY = { name: "", code: "", value: "", purchaseDate: "", notes: "" };

export function EquipmentManager({
  initial,
  projects,
}: {
  initial: EquipmentItem[];
  projects: Project[];
}) {
  const { fmtCompact } = useCurrency();
  const t      = useTranslations("equipment");
  const tCommon = useTranslations("common");
  const locale  = useLocale();

  const [equipment, setEquipment] = useState(initial);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const filtered = equipment.filter((e) => {
    if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.name.toLowerCase().includes(q) || e.code?.toLowerCase().includes(q);
    }
    return true;
  });

  const totalValue       = equipment.reduce((s, e) => s + (e.value ?? 0), 0);
  const inUseCount       = equipment.filter((e) => e.status === "IN_USE").length;
  const maintenanceCount = equipment.filter((e) => e.status === "MAINTENANCE").length;

  function handleAdd() {
    if (!form.name.trim()) { setFormError(t("form.nameRequired")); return; }
    startTransition(async () => {
      const res = await createEquipment({
        name:         form.name.trim(),
        code:         form.code         || undefined,
        value:        form.value        ? parseFloat(form.value)        : undefined,
        purchaseDate: form.purchaseDate || undefined,
        notes:        form.notes        || undefined,
      });
      if (!res.success) { setFormError(res.error); return; }
      toast.success(t("add.toastSuccess"));
      setAddOpen(false);
      setForm(EMPTY);
      setFormError(null);
      window.location.reload();
    });
  }

  function handleAssign(equipmentId: string) {
    if (!selectedProject) return;
    startTransition(async () => {
      await assignEquipmentToProject(equipmentId, selectedProject);
      toast.success(t("assign.toastSuccess"));
      setAssignOpen(null);
      setSelectedProject("");
      window.location.reload();
    });
  }

  function handleUnassign(equipmentId: string) {
    startTransition(async () => {
      await unassignEquipment(equipmentId);
      toast.success(t("unassign.toastSuccess"));
      setEquipment((prev) =>
        prev.map((e) =>
          e.id === equipmentId ? { ...e, status: "AVAILABLE", logs: [] } : e
        )
      );
    });
  }

  function handleConfirmDelete() {
    if (!deletingId) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const res = await deleteEquipment(deletingId);
      if (res.success) {
        toast.success(t("delete.toastSuccess"));
        setEquipment((prev) => prev.filter((e) => e.id !== deletingId));
        setDeletingId(null);
      } else {
        setDeleteError(res.error ?? t("delete.deleteError"));
        toast.error(res.error ?? t("delete.toastError"));
      }
    });
  }

  const assigningEquipment = assignOpen ? equipment.find((e) => e.id === assignOpen) : null;

  const tStatus = (s: string) => {
    try { return t(`status.${s}` as Parameters<typeof t>[0]); }
    catch { return s; }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { labelKey: "stats.total",       value: equipment.length,       color: "text-foreground"  },
          { labelKey: "stats.inUse",       value: inUseCount,             color: "text-blue-600"    },
          { labelKey: "stats.maintenance", value: maintenanceCount,        color: "text-orange-600"  },
          { labelKey: "stats.totalValue",  value: fmtCompact(totalValue),  color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.labelKey} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{t(s.labelKey as Parameters<typeof t>[0])}</p>
            <p className={`text-xl font-bold mt-0.5 tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTER_KEYS.map((k) => (
            <Button
              key={k}
              variant={statusFilter === k ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusFilter(k)}
            >
              {t(`filter.${k}` as Parameters<typeof t>[0])}
            </Button>
          ))}
        </div>
        <div className="sm:ms-auto">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 me-1" />
                {t("addEquipment")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir={locale === "he" ? "rtl" : "ltr"}>
              <DialogHeader>
                <DialogTitle>{t("newEquipment")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>{t("form.name")} *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("form.namePlaceholder")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("form.code")}</Label>
                    <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder={t("form.codePlaceholder")} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("form.value")}</Label>
                    <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="150000" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t("form.purchaseDate")}</Label>
                  <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{t("form.notes")}</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("form.notesPlaceholder")} />
                </div>
                {formError && <p className="text-sm text-red-500">{formError}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => { setAddOpen(false); setForm(EMPTY); setFormError(null); }}>{tCommon("cancel")}</Button>
                  <Button onClick={handleAdd}>{t("addEquipment")}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Assign to project dialog */}
      <Dialog open={!!assignOpen} onOpenChange={(v) => { if (!v) { setAssignOpen(null); setSelectedProject(""); } }}>
        <DialogContent className="sm:max-w-sm" dir={locale === "he" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("assign.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              {assigningEquipment?.name}
              {assigningEquipment?.code && <span className="ms-1 text-xs">({assigningEquipment.code})</span>}
            </p>
            <div className="space-y-1">
              <Label>{t("assign.project")}</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder={t("assign.selectProject")} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setAssignOpen(null); setSelectedProject(""); }}>{tCommon("cancel")}</Button>
              <Button disabled={!selectedProject} onClick={() => assignOpen && handleAssign(assignOpen)}>
                {t("assign.submit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs">{t("table.equipment")}</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3 text-xs">{t("table.status")}</th>
                <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs hidden sm:table-cell">{t("table.project")}</th>
                <th className="text-end font-medium text-muted-foreground px-4 py-3 text-xs hidden md:table-cell">{t("table.value")}</th>
                <th className="text-end font-medium text-muted-foreground px-4 py-3 text-xs">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground text-sm py-10">
                    {t("empty")}
                  </td>
                </tr>
              )}
              {filtered.map((eq) => {
                const stCls    = STATUS_CLASS[eq.status] ?? "";
                const activeLog = eq.logs[0];
                return (
                  <tr key={eq.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                          <Wrench className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium leading-none">{eq.name}</p>
                          {eq.code && <p className="text-[11px] text-muted-foreground mt-0.5">{eq.code}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${stCls}`}>
                          {tStatus(eq.status)}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {activeLog ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FolderKanban className="h-3 w-3 shrink-0" />
                          {activeLog.project.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end tabular-nums text-muted-foreground hidden md:table-cell">
                      {eq.value ? fmtCompact(eq.value) : "—"}
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
                            {(eq.status === "IN_USE" || activeLog) && (
                              <DropdownMenuItem onClick={() => handleUnassign(eq.id)}>
                                <X className="h-4 w-4 me-2" />
                                {t("unassign.action")}
                              </DropdownMenuItem>
                            )}
                            {eq.status === "AVAILABLE" && (
                              <DropdownMenuItem onClick={() => setAssignOpen(eq.id)}>
                                <FolderKanban className="h-4 w-4 me-2" />
                                {t("assign.action")}
                              </DropdownMenuItem>
                            )}
                            {(eq.status === "IN_USE" || activeLog || eq.status === "AVAILABLE") && (
                              <DropdownMenuSeparator />
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => { setDeleteError(null); setDeletingId(eq.id); }}
                            >
                              <Trash2 className="h-4 w-4 me-2" />
                              {t("actions.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(v) => { if (!v) { setDeletingId(null); setDeleteError(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.confirm")}</AlertDialogTitle>
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
              {t("delete.action")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
