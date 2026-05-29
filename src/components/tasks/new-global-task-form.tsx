"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Phone, Users, Mail, CheckSquare2, X, Send,
  FolderKanban, TrendingUp, Building2, User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createTask } from "@/actions/tasks";
import { toast } from "sonner";
import type { TaskTypeValue } from "@/lib/constants/task-enums";

// ─── Types ────────────────────────────────────────────────────────────────────

type SelectItem = { id: string; name: string };

export type SelectData = {
  projects: SelectItem[];
  clients:  SelectItem[];
  leads:    SelectItem[];
  users:    SelectItem[];
};

type ContextType = "personal" | "project" | "lead" | "client";

// ─── Static icon/color config (labels come from translations) ─────────────────

const TYPE_CONFIG: { value: TaskTypeValue; Icon: React.ElementType; color: string }[] = [
  { value: "GENERAL", Icon: CheckSquare2, color: "text-slate-600"   },
  { value: "CALL",    Icon: Phone,        color: "text-emerald-600" },
  { value: "MEETING", Icon: Users,        color: "text-blue-600"    },
  { value: "EMAIL",   Icon: Mail,         color: "text-violet-600"  },
];

const CONTEXT_CONFIG: { value: ContextType; Icon: React.ElementType }[] = [
  { value: "personal", Icon: UserIcon     },
  { value: "project",  Icon: FolderKanban },
  { value: "lead",     Icon: TrendingUp   },
  { value: "client",   Icon: Building2    },
];

const PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function NewGlobalTaskForm({
  selectData,
  defaultContext,
  defaultContextId,
  onCreated,
  onCancel,
}: {
  selectData:         SelectData;
  defaultContext?:    ContextType;
  defaultContextId?:  string;
  onCreated:          () => void;
  onCancel:           () => void;
}) {
  const t      = useTranslations("globalTasks");
  const tCommon = useTranslations("common");
  const locale  = useLocale();

  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [taskType,    setTaskType]    = useState<TaskTypeValue>("GENERAL");
  const [context,     setContext]     = useState<ContextType>(defaultContext ?? "personal");
  const [contextId,   setContextId]   = useState(defaultContextId ?? "");
  const [dueDate,     setDueDate]     = useState("");
  const [priority,    setPriority]    = useState("MEDIUM");
  const [assigneeId,  setAssigneeId]  = useState("");
  const [isPending,   start]          = useTransition();

  function handleSubmit() {
    if (!name.trim()) {
      toast.error(t("form.nameRequired"));
      return;
    }

    start(async () => {
      const res = await createTask({
        name:         name.trim(),
        description:  description || undefined,
        taskType,
        status:       "TODO",
        priority:     priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
        projectId:    context === "project" && contextId ? contextId : undefined,
        leadId:       context === "lead"    && contextId ? contextId : undefined,
        clientId:     context === "client"  && contextId ? contextId : undefined,
        assignedToId: assigneeId || undefined,
        dueDate:      dueDate    || undefined,
      });

      if (!res.success) {
        toast.error((res as { error?: string }).error ?? t("form.toastError"));
        return;
      }

      toast.success(t("form.toastSuccess"));
      onCreated();
    });
  }

  const contextItems =
    context === "project" ? selectData.projects :
    context === "lead"    ? selectData.leads    :
    context === "client"  ? selectData.clients  : [];

  const contextPlaceholder =
    context === "project" ? t("form.selectProject") :
    context === "lead"    ? t("form.selectLead")     : t("form.selectClient");

  return (
    <div
      className="rounded-xl border border-primary/30 bg-card shadow-md p-4 space-y-4"
      dir={locale === "he" ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("form.title")}</h3>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Name */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("form.name")} *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("form.namePlaceholder")}
          className="h-9 text-sm"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSubmit(); }}
        />
      </div>

      {/* Type selector pills */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("form.type")}</Label>
        <div className="flex gap-1.5 flex-wrap">
          {TYPE_CONFIG.map(({ value, Icon, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTaskType(value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                taskType === value
                  ? "bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/20"
                  : "bg-muted/30 border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className={cn("h-3 w-3", taskType === value ? "text-primary" : color)} />
              {t(`type.${value}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {/* Context selector */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("form.context")}</Label>
        <div className="flex gap-1.5 flex-wrap">
          {CONTEXT_CONFIG.map(({ value, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setContext(value); setContextId(""); }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                context === value
                  ? "bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/20"
                  : "bg-muted/30 border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-3 w-3" />
              {t(`context.${value}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>

        {/* Context entity select */}
        {context !== "personal" && contextItems.length > 0 && (
          <Select value={contextId} onValueChange={setContextId}>
            <SelectTrigger className="h-8 text-sm mt-1.5">
              <SelectValue placeholder={contextPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {contextItems.map((item) => (
                <SelectItem key={item.id} value={item.id} className="text-sm">
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {context !== "personal" && contextItems.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">{t("form.noItems")}</p>
        )}
      </div>

      {/* Row: Due datetime + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("form.dueDate")}</Label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            dir="ltr"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("form.priority")}</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_VALUES.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {t(`priority.${p}` as Parameters<typeof t>[0])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assignee */}
      {selectData.users.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("form.assignee")}</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={t("form.noAssignee")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-sm text-muted-foreground">{t("form.noAssignee")}</SelectItem>
              {selectData.users.map((u) => (
                <SelectItem key={u.id} value={u.id} className="text-sm">{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Description */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("form.description")}</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("form.descPlaceholder")}
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" className="h-8" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>
        <Button size="sm" className="h-8 gap-1.5" onClick={handleSubmit} disabled={isPending || !name.trim()}>
          <Send className="h-3.5 w-3.5" />
          {isPending ? t("form.creating") : t("form.create")}
        </Button>
      </div>
    </div>
  );
}
