"use client";

import { useState, useTransition } from "react";
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

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  AVAILABLE:   { label: "פנוי",      cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  IN_USE:      { label: "בשימוש",    cls: "bg-blue-100 text-blue-700 border-blue-200" },
  MAINTENANCE: { label: "תחזוקה",    cls: "bg-orange-100 text-orange-700 border-orange-200" },
  RETIRED:     { label: "יצא משימוש", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

const STATUS_FILTERS = [
  { value: "ALL",         label: "הכל" },
  { value: "AVAILABLE",   label: "פנוי" },
  { value: "IN_USE",      label: "בשימוש" },
  { value: "MAINTENANCE", label: "תחזוקה" },
];

const EMPTY = { name: "", code: "", value: "", purchaseDate: "", notes: "" };

function fmtShekel(v: number) {
  if (v >= 1_000_000) return `₪${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₪${(v / 1_000).toFixed(0)}K`;
  return `₪${v.toLocaleString("he-IL")}`;
}

export function EquipmentManager({
  initial,
  projects,
}: {
  initial: EquipmentItem[];
  projects: Project[];
}) {
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

  const totalValue = equipment.reduce((s, e) => s + (e.value ?? 0), 0);
  const inUseCount = equipment.filter((e) => e.status === "IN_USE").length;
  const maintenanceCount = equipment.filter((e) => e.status === "MAINTENANCE").length;

  function handleAdd() {
    if (!form.name.trim()) { setFormError("שם הציוד הוא שדה חובה."); return; }
    startTransition(async () => {
      const res = await createEquipment({
        name: form.name.trim(),
        code: form.code || undefined,
        value: form.value ? parseFloat(form.value) : undefined,
        purchaseDate: form.purchaseDate || undefined,
        notes: form.notes || undefined,
      });
      if (!res.success) { setFormError(res.error); return; }
      toast.success("ציוד נוסף בהצלחה");
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
      toast.success("ציוד שויך לפרויקט");
      setAssignOpen(null);
      setSelectedProject("");
      window.location.reload();
    });
  }

  function handleUnassign(equipmentId: string) {
    startTransition(async () => {
      await unassignEquipment(equipmentId);
      toast.success("ציוד שוחרר מהפרויקט");
      setEquipment((prev) =>
        prev.map((e) =>
          e.id === equipmentId
            ? { ...e, status: "AVAILABLE", logs: [] }
            : e
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
        toast.success("הציוד נמחק בהצלחה");
        setEquipment((prev) => prev.filter((e) => e.id !== deletingId));
        setDeletingId(null);
      } else {
        setDeleteError(res.error ?? "שגיאה במחיקה");
        toast.error(res.error ?? "לא ניתן למחוק ציוד זה");
      }
    });
  }

  const assigningEquipment = assignOpen ? equipment.find((e) => e.id === assignOpen) : null;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "סה״כ ציוד",    value: equipment.length,    color: "text-foreground" },
          { label: "בשימוש",       value: inUseCount,          color: "text-blue-600" },
          { label: "בתחזוקה",      value: maintenanceCount,    color: "text-orange-600" },
          { label: "שווי כולל",    value: fmtShekel(totalValue), color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="חיפוש ציוד, קוד..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="sm:ms-auto">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 me-1" />
                הוסף ציוד
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle>ציוד חדש</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>שם הציוד *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="מחפר CAT 320" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>קוד ציוד</Label>
                    <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="EQ-011" />
                  </div>
                  <div className="space-y-1">
                    <Label>ערך / שווי (₪)</Label>
                    <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="150000" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>תאריך רכישה</Label>
                  <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>הערות</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="מידע נוסף..." />
                </div>
                {formError && <p className="text-sm text-red-500">{formError}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => { setAddOpen(false); setForm(EMPTY); setFormError(null); }}>ביטול</Button>
                  <Button onClick={handleAdd}>הוסף</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Assign to project dialog */}
      <Dialog open={!!assignOpen} onOpenChange={(v) => { if (!v) { setAssignOpen(null); setSelectedProject(""); } }}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>שיוך ציוד לפרויקט</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              {assigningEquipment?.name}
              {assigningEquipment?.code && <span className="ms-1 text-xs">({assigningEquipment.code})</span>}
            </p>
            <div className="space-y-1">
              <Label>פרויקט</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר פרויקט..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setAssignOpen(null); setSelectedProject(""); }}>ביטול</Button>
              <Button disabled={!selectedProject} onClick={() => assignOpen && handleAssign(assignOpen)}>שייך</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs">ציוד</th>
              <th className="text-center font-medium text-muted-foreground px-4 py-3 text-xs">סטטוס</th>
              <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs hidden sm:table-cell">פרויקט נוכחי</th>
              <th className="text-end font-medium text-muted-foreground px-4 py-3 text-xs hidden md:table-cell">שווי</th>
              <th className="text-end font-medium text-muted-foreground px-4 py-3 text-xs">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground text-sm py-10">
                  לא נמצא ציוד.
                </td>
              </tr>
            )}
            {filtered.map((eq) => {
              const stCfg = STATUS_CONFIG[eq.status] ?? { label: eq.status, cls: "" };
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
                        {eq.code && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{eq.code}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${stCfg.cls}`}>
                        {stCfg.label}
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
                    {eq.value ? fmtShekel(eq.value) : "—"}
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
                              שחרר מפרויקט
                            </DropdownMenuItem>
                          )}
                          {eq.status === "AVAILABLE" && (
                            <DropdownMenuItem onClick={() => setAssignOpen(eq.id)}>
                              <FolderKanban className="h-4 w-4 me-2" />
                              שייך לפרויקט
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
                            מחיקה
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

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(v) => { if (!v) { setDeletingId(null); setDeleteError(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הציוד לצמיתות ואינה הפיכה.
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
              מחק ציוד
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
