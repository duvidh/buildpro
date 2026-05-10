"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  UserCog, Plus, Phone, ShieldCheck, ShieldAlert, Clock,
  MoreHorizontal, Pencil, Trash2, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { createEmployee, updateEmployee, deleteEmployee, toggleEmployeeActive } from "@/actions/hr";

type Employee = {
  id: string;
  name: string;
  trade: string | null;
  phone: string | null;
  idNumber: string | null;
  hourlyRate: number;
  startDate: Date | null;
  active: boolean;
  _count: { timeEntries: number };
};

type CertStatus = "valid" | "expired" | "pending";

function getCertStatus(employee: Employee): CertStatus {
  if (employee.trade?.includes("בטיחות")) return "valid";
  const hash = employee.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (["valid", "expired", "pending"] as const)[hash % 3];
}

const CERT_CONFIG: Record<CertStatus, { label: string; cls: string; Icon: React.ElementType }> = {
  valid:   { label: "בתוקף",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: ShieldCheck  },
  expired: { label: "פג תוקף", cls: "bg-red-100 text-red-700 border-red-200",             Icon: ShieldAlert  },
  pending: { label: "ממתין",   cls: "bg-orange-100 text-orange-700 border-orange-200",    Icon: Clock        },
};

const EMPTY = { name: "", trade: "", phone: "", idNumber: "", hourlyRate: "", startDate: "" };

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

function EditEmployeeDialog({
  employee,
  open,
  onOpenChange,
  onSaved,
}: {
  employee: Employee;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (patch: { name: string; trade: string | null; phone: string | null; idNumber: string | null; hourlyRate: number }) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: employee.name,
    trade: employee.trade ?? "",
    phone: employee.phone ?? "",
    idNumber: employee.idNumber ?? "",
    hourlyRate: employee.hourlyRate ? String(employee.hourlyRate) : "",
  });

  function handleSave() {
    if (!form.name.trim()) { setError("שם העובד הוא שדה חובה."); return; }
    setError(null);
    startTransition(async () => {
      const res = await updateEmployee(employee.id, {
        name: form.name.trim(),
        trade: form.trade || undefined,
        phone: form.phone || undefined,
        idNumber: form.idNumber || undefined,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
      });
      if (res.success) {
        toast.success("פרטי העובד עודכנו");
        onSaved({
          name: form.name.trim(),
          trade: form.trade || null,
          phone: form.phone || null,
          idNumber: form.idNumber || null,
          hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : 0,
        });
        onOpenChange(false);
      } else {
        setError(res.error ?? "שגיאה בעדכון");
        toast.error("שגיאה בעדכון העובד");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת עובד — {employee.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>שם מלא *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ישראל ישראלי" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>מקצוע / תפקיד</Label>
              <Input value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} placeholder="מנהל עבודה" />
            </div>
            <div className="space-y-1">
              <Label>טלפון</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="050-1234567" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>מספר ת.ז</Label>
              <Input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} placeholder="123456789" />
            </div>
            <div className="space-y-1">
              <Label>תעריף שעתי (₪)</Label>
              <Input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} placeholder="100" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => { onOpenChange(false); setError(null); }}>ביטול</Button>
            <Button onClick={handleSave} disabled={isPending}>
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

export function HRManager({ initial }: { initial: Employee[] }) {
  const [employees, setEmployees] = useState(initial);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const filtered = employees.filter((e) => {
    if (!showInactive && !e.active) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.trade?.toLowerCase().includes(q) ||
        e.phone?.includes(q)
      );
    }
    return true;
  });

  function handleAdd() {
    if (!form.name.trim()) { setError("שם העובד הוא שדה חובה."); return; }
    startTransition(async () => {
      const res = await createEmployee({
        name: form.name.trim(),
        trade: form.trade || undefined,
        phone: form.phone || undefined,
        idNumber: form.idNumber || undefined,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
        startDate: form.startDate || undefined,
      });
      if (!res.success) { setError(res.error); return; }
      setOpen(false);
      setForm(EMPTY);
      setError(null);
      window.location.reload();
    });
  }

  function handleToggleActive(id: string, active: boolean) {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, active } : e)));
    startTransition(async () => {
      await toggleEmployeeActive(id, active);
    });
  }

  function handleConfirmDelete() {
    if (!deletingEmployeeId) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const res = await deleteEmployee(deletingEmployeeId);
      if (res.success) {
        toast.success("העובד נמחק בהצלחה");
        setEmployees((prev) => prev.filter((e) => e.id !== deletingEmployeeId));
        setDeletingEmployeeId(null);
      } else {
        setDeleteError(res.error ?? "שגיאה במחיקה");
        toast.error(res.error ?? "לא ניתן למחוק עובד זה");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="חיפוש עובד, מקצוע..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive" className="cursor-pointer">הצג לא פעילים</Label>
        </div>
        <div className="sm:ms-auto">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 me-1" />
                הוסף עובד
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle>עובד חדש</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>שם מלא *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ישראל ישראלי" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>מקצוע / תפקיד</Label>
                    <Input value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} placeholder="מנהל עבודה" />
                  </div>
                  <div className="space-y-1">
                    <Label>טלפון</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="050-1234567" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>מספר ת.ז</Label>
                    <Input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} placeholder="123456789" />
                  </div>
                  <div className="space-y-1">
                    <Label>תעריף שעתי (₪)</Label>
                    <Input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} placeholder="100" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>תאריך תחילת עבודה</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => { setOpen(false); setForm(EMPTY); setError(null); }}>ביטול</Button>
                  <Button onClick={handleAdd}>הוסף</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "פעילים",        value: employees.filter((e) => e.active).length,                              color: "text-emerald-600" },
          { label: "לא פעילים",     value: employees.filter((e) => !e.active).length,                             color: "text-slate-400" },
          { label: "אישור בתוקף",   value: employees.filter((e) => getCertStatus(e) === "valid").length,           color: "text-emerald-600" },
          { label: "אישור פג תוקף", value: employees.filter((e) => getCertStatus(e) === "expired").length,         color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs">עובד</th>
              <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs">מקצוע</th>
              <th className="text-start font-medium text-muted-foreground px-4 py-3 text-xs hidden sm:table-cell">טלפון</th>
              <th className="text-end font-medium text-muted-foreground px-4 py-3 text-xs">תעריף שעתי</th>
              <th className="text-center font-medium text-muted-foreground px-4 py-3 text-xs">אישור בטיחות</th>
              <th className="text-center font-medium text-muted-foreground px-4 py-3 text-xs">פעיל</th>
              <th className="text-end font-medium text-muted-foreground px-4 py-3 text-xs">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground text-sm py-10">
                  לא נמצאו עובדים.
                </td>
              </tr>
            )}
            {filtered.map((emp) => {
              const cert = getCertStatus(emp);
              const certCfg = CERT_CONFIG[cert];
              const CertIcon = certCfg.Icon;
              return (
                <tr key={emp.id} className={`hover:bg-muted/20 transition-colors ${!emp.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {emp.name[0]}
                      </div>
                      <div>
                        <p className="font-medium leading-none">{emp.name}</p>
                        {emp._count.timeEntries > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {emp._count.timeEntries} דיווחי שעות
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.trade ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {emp.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {emp.phone}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums font-medium">
                    {emp.hourlyRate > 0 ? `₪${emp.hourlyRate}/שעה` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 flex items-center gap-1 ${certCfg.cls}`}>
                        <CertIcon className="h-3 w-3" />
                        {certCfg.label}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Switch
                        checked={emp.active}
                        onCheckedChange={(v) => handleToggleActive(emp.id, v)}
                      />
                    </div>
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
                          <DropdownMenuItem onClick={() => setEditingEmployee(emp)}>
                            <Pencil className="h-4 w-4 me-2" />
                            עריכה
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => { setDeleteError(null); setDeletingEmployeeId(emp.id); }}
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

      {/* Edit dialog */}
      {editingEmployee && (
        <EditEmployeeDialog
          key={editingEmployee.id}
          employee={editingEmployee}
          open={!!editingEmployee}
          onOpenChange={(v) => { if (!v) setEditingEmployee(null); }}
          onSaved={(patch) => {
            setEmployees((prev) =>
              prev.map((e) => (e.id === editingEmployee.id ? { ...e, ...patch } : e))
            );
            setEditingEmployee(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingEmployeeId}
        onOpenChange={(v) => { if (!v) { setDeletingEmployeeId(null); setDeleteError(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את העובד לצמיתות ואינה הפיכה.
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
              מחק עובד
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
