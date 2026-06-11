"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { usePathname, useParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import {
  Sparkles, X, Send, BotMessageSquare, RotateCcw, Mic, MicOff, Zap, Database,
  CheckSquare, CalendarDays, Check, Loader2, ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { getAiQuota, type AIContext, type AiQuota } from "@/actions/ai";
import { executeCreateTask } from "@/actions/tasks";
import { executeCreateDailyLog } from "@/actions/daily-logs";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type RegularChip = { label: string; prompt: string };
type VoiceChip   = { label: string; voice: true };
type Chip = RegularChip | VoiceChip;

// ─── Static data ──────────────────────────────────────────────────────────────

const CHIPS: Record<AIContext, Record<"he" | "en", Chip[]>> = {
  project: {
    he: [
      { label: "💰 סטטוס תקציב ותשלומים", prompt: "מה סטטוס התקציב והתשלומים של הפרויקט הזה?" },
      { label: "📋 מה דווח מהשטח?",        prompt: "סכם לי את יומני העבודה האחרונים של הפרויקט הזה" },
      { label: "🎙️ הקלט משימה/דיווח",     voice: true },
    ],
    en: [
      { label: "💰 Budget & Payments", prompt: "What's the budget and payment status of this project?" },
      { label: "📋 Field Reports",      prompt: "Summarize the recent daily logs for this project" },
      { label: "🎙️ Record Voice",      voice: true },
    ],
  },
  client: {
    he: [
      { label: "💰 יתרת חוב",         prompt: "מה יתרת החוב של הלקוח הזה?" },
      { label: "📄 חשבוניות פתוחות", prompt: "אילו חשבוניות פתוחות יש ללקוח הזה?" },
      { label: "🎙️ הקלט הערה",        voice: true },
    ],
    en: [
      { label: "💰 Outstanding Balance", prompt: "What's this client's outstanding balance?" },
      { label: "📄 Open Invoices",        prompt: "Which invoices are still open for this client?" },
      { label: "🎙️ Record Note",         voice: true },
    ],
  },
  generic: {
    he: [
      { label: "🏗️ אילו פרויקטים פעילים?", prompt: "אילו פרויקטים פעילים יש לנו ומה ההתקדמות שלהם?" },
      { label: "💰 מי חייב לנו כסף?",       prompt: "לאילו לקוחות יש יתרת חוב פתוחה?" },
      { label: "🎙️ דיווח שטח",             voice: true },
    ],
    en: [
      { label: "🏗️ Active Projects",  prompt: "Which projects are active and how are they progressing?" },
      { label: "💰 Who owes us money?", prompt: "Which clients have an open balance?" },
      { label: "🎙️ Field Report",      voice: true },
    ],
  },
};

// Two flavours per locale — one task-oriented, one log-oriented — picked at random.
const MOCK_TRANSCRIPTIONS: Record<"he" | "en", readonly string[]> = {
  he: [
    "מה מצב התשלומים בפרויקט הזה? יש חשבוניות באיחור?",
    "תן לי סיכום של הדיווחים האחרונים מהשטח בפרויקט הזה.",
  ],
  en: [
    "What's the payment status on this project? Any overdue invoices?",
    "Give me a summary of the recent field reports for this project.",
  ],
};

const CONTEXT_TITLE = {
  project: { he: "עוזר פרויקט AI",   en: "AI Project Assistant" },
  client:  { he: "עוזר לקוח AI",     en: "AI Client Assistant"  },
  generic: { he: "עוזר AI חכם",      en: "AI Assistant"         },
} as const;

const UI = {
  he: {
    trigger:       "✨ שאל את עוזר ה-AI",
    badge:         "Beta",
    placeholder:   "שאל שאלה חופשית...",
    quotaReached:  "המכסה הסתיימה (Quota reached)",
    hint:          "בחר נושא מהירושים למטה, או כתוב שאלה.",
    analyzing:     "מנתח נתונים...",
    checkingData:  "בודק נתוני מערכת...",
    reset:         "שיחה חדשה",
    recording:     "מקליט...",
    cancelRec:     "ביטול הקלטה",
    micLabel:      "הקלט הודעה קולית",
    quotaLeft:     (n: number, total: number) => `נותרו ${n} שאלות מתוך ${total}`,
    quotaDone:     "מכסת השאלות הסתיימה",
    error:         "אירעה שגיאה — נסה שוב.",
    errorQuota:    "מכסת השאלות של החברה הסתיימה.",
    taskCardTitle: "אישור משימה חדשה",
    taskDue:       "תאריך יעד",
    taskPriority:  "עדיפות",
    taskApprove:   "אשר משימה",
    taskCancel:    "בטל",
    taskApproved:  "המשימה נוצרה ✓",
    taskCancelled: "המשימה בוטלה",
    taskFailedMsg: "יצירת המשימה נכשלה",
    taskToast:     "המשימה נוצרה בהצלחה!",
    priorities:    { LOW: "נמוכה", MEDIUM: "בינונית", HIGH: "גבוהה", URGENT: "דחופה" } as Record<string, string>,
    logCardTitle:  "אישור יומן עבודה",
    logWeather:    "מזג אוויר",
    logWorkforce:  "כוח אדם",
    logWorkers:    (n: number) => `${n} עובדים`,
    logSafety:     "בטיחות",
    logNoSafety:   "ללא אירועי בטיחות",
    logApprove:    "אשר יומן",
    logApproved:   "היומן נשמר ✓",
    logCancelled:  "היומן בוטל",
    logFailedMsg:  "שמירת היומן נכשלה",
    logDuplicate:  "כבר קיים יומן עבודה לתאריך זה",
    logToast:      "היומן נשמר בהצלחה!",
  },
  en: {
    trigger:       "✨ Ask AI Assistant",
    badge:         "Beta",
    placeholder:   "Ask a free-form question...",
    quotaReached:  "Quota reached",
    hint:          "Pick a topic below, or type a question.",
    analyzing:     "Analyzing data…",
    checkingData:  "Checking system data…",
    reset:         "New conversation",
    recording:     "Recording...",
    cancelRec:     "Cancel",
    micLabel:      "Record voice message",
    quotaLeft:     (n: number, total: number) => `${n} of ${total} queries left`,
    quotaDone:     "Query quota reached",
    error:         "Something went wrong — please try again.",
    errorQuota:    "Your company's query quota has been reached.",
    taskCardTitle: "Confirm New Task",
    taskDue:       "Due date",
    taskPriority:  "Priority",
    taskApprove:   "Approve Task",
    taskCancel:    "Cancel",
    taskApproved:  "Task created ✓",
    taskCancelled: "Task cancelled",
    taskFailedMsg: "Creating the task failed",
    taskToast:     "Task created successfully!",
    priorities:    { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" } as Record<string, string>,
    logCardTitle:  "Confirm Daily Log",
    logWeather:    "Weather",
    logWorkforce:  "Workforce",
    logWorkers:    (n: number) => `${n} workers`,
    logSafety:     "Safety",
    logNoSafety:   "No safety incidents",
    logApprove:    "Approve Log",
    logApproved:   "Log saved ✓",
    logCancelled:  "Log cancelled",
    logFailedMsg:  "Saving the log failed",
    logDuplicate:  "A daily log already exists for this date",
    logToast:      "Log saved successfully!",
  },
} as const;

const RECORDING_MS = 2500;

// ─── Task confirmation card (human-in-the-loop) ───────────────────────────────

type TaskDraft = { title?: string; dueDate?: string; priority?: string };
type TaskOutcome = { status?: string } | undefined;

const PRIORITY_BADGE: Record<string, string> = {
  LOW:    "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  MEDIUM: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  HIGH:   "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  URGENT: "bg-red-500/10 text-red-600 dark:text-red-400",
};

function TaskConfirmationCard({
  draft,
  ready,
  outcome,
  locale,
  onApprove,
  onCancel,
}: {
  draft: TaskDraft;
  ready: boolean;            // tool input fully streamed — buttons may show
  outcome: TaskOutcome;      // set once the user approved / cancelled
  locale: "he" | "en";
  onApprove: () => Promise<void>;
  onCancel: () => void;
}) {
  const u = UI[locale];
  const [saving, setSaving] = useState(false);

  const priority = draft.priority?.toUpperCase() ?? "MEDIUM";
  const dueParsed = draft.dueDate ? new Date(draft.dueDate) : null;
  const dueLabel =
    dueParsed && !Number.isNaN(dueParsed.getTime())
      ? new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
          day: "numeric", month: "long", year: "numeric",
        }).format(dueParsed)
      : draft.dueDate ?? "—";

  async function handleApprove() {
    setSaving(true);
    try { await onApprove(); } finally { setSaving(false); }
  }

  const status = outcome?.status;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden transition-colors",
        status === "created"
          ? "border-emerald-500/30 bg-emerald-500/[0.04]"
          : status === "cancelled" || status === "failed"
          ? "border-border/40 bg-muted/20 opacity-75"
          : "border-violet-300/50 dark:border-violet-700/50 bg-gradient-to-br from-violet-50/60 to-indigo-50/40 dark:from-violet-950/20 dark:to-indigo-950/15",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
          <CheckSquare className="h-3.5 w-3.5" />
          {u.taskCardTitle}
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", PRIORITY_BADGE[priority] ?? PRIORITY_BADGE.MEDIUM)}>
          {u.priorities[priority] ?? priority}
        </span>
      </div>

      {/* Details */}
      <div className="px-3.5 py-2.5 space-y-1.5">
        <p className="text-sm font-semibold text-foreground leading-snug">
          {draft.title ?? "…"}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{u.taskDue}: {dueLabel}</span>
        </div>
      </div>

      {/* Footer: outcome or actions */}
      <div className="px-3.5 pb-3">
        {status === "created" ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            {u.taskApproved}
          </div>
        ) : status === "cancelled" ? (
          <p className="text-xs text-muted-foreground">{u.taskCancelled}</p>
        ) : status === "failed" ? (
          <p className="text-xs text-destructive">{u.taskFailedMsg}</p>
        ) : ready ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={saving}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white",
                "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm",
                "hover:shadow-[0_4px_12px_rgba(16,185,129,0.35)] hover:scale-[1.02]",
                "active:scale-95 transition-all duration-150",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100",
              )}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {u.taskApprove}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-lg border border-border/50 bg-muted/30 px-3.5 py-1.5 text-xs font-medium text-muted-foreground
                hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {u.taskCancel}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />…
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Daily log confirmation card (human-in-the-loop) ──────────────────────────

type DailyLogDraft = {
  projectId?: string;
  date?: string;
  weather?: string;
  workforceCount?: number;
  progressNotes?: string;
  safetyIssues?: string;
};

function DailyLogConfirmationCard({
  draft,
  ready,
  outcome,
  locale,
  onApprove,
  onCancel,
}: {
  draft: DailyLogDraft;
  ready: boolean;
  outcome: TaskOutcome;
  locale: "he" | "en";
  onApprove: () => Promise<void>;
  onCancel: () => void;
}) {
  const u = UI[locale];
  const [saving, setSaving] = useState(false);

  const dateParsed = draft.date ? new Date(draft.date) : null;
  const dateLabel =
    dateParsed && !Number.isNaN(dateParsed.getTime())
      ? new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
          weekday: "short", day: "numeric", month: "long",
        }).format(dateParsed)
      : draft.date ?? "—";

  async function handleApprove() {
    setSaving(true);
    try { await onApprove(); } finally { setSaving(false); }
  }

  const status = outcome?.status;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden transition-colors",
        status === "created"
          ? "border-emerald-500/30 bg-emerald-500/[0.04]"
          : status === "cancelled" || status === "failed"
          ? "border-border/40 bg-muted/20 opacity-75"
          : "border-sky-300/50 dark:border-sky-700/50 bg-gradient-to-br from-sky-50/60 to-cyan-50/40 dark:from-sky-950/20 dark:to-cyan-950/15",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
          <ClipboardList className="h-3.5 w-3.5" />
          {u.logCardTitle}
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">{dateLabel}</span>
      </div>

      {/* Details */}
      <div className="px-3.5 py-2.5 space-y-1.5 text-xs">
        <div className="flex flex-wrap gap-1.5">
          {draft.weather && (
            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 font-medium text-sky-600 dark:text-sky-400">
              {u.logWeather}: {draft.weather}
            </span>
          )}
          {typeof draft.workforceCount === "number" && (
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 font-medium text-violet-600 dark:text-violet-300">
              {u.logWorkforce}: {u.logWorkers(draft.workforceCount)}
            </span>
          )}
        </div>
        {draft.progressNotes && (
          <p className="text-sm leading-snug text-foreground whitespace-pre-wrap">
            {draft.progressNotes}
          </p>
        )}
        <p className={cn(
          "text-[11px]",
          draft.safetyIssues ? "text-amber-600 dark:text-amber-400" : "text-emerald-600",
        )}>
          {u.logSafety}: {draft.safetyIssues || u.logNoSafety}
        </p>
      </div>

      {/* Footer: outcome or actions */}
      <div className="px-3.5 pb-3">
        {status === "created" ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            {u.logApproved}
          </div>
        ) : status === "cancelled" ? (
          <p className="text-xs text-muted-foreground">{u.logCancelled}</p>
        ) : status === "failed" ? (
          <p className="text-xs text-destructive">{u.logFailedMsg}</p>
        ) : ready ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={saving}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white",
                "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm",
                "hover:shadow-[0_4px_12px_rgba(16,185,129,0.35)] hover:scale-[1.02]",
                "active:scale-95 transition-all duration-150",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100",
              )}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {u.logApprove}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-lg border border-border/50 bg-muted/30 px-3.5 py-1.5 text-xs font-medium text-muted-foreground
                hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {u.taskCancel}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />…
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AIAssistantBar() {
  const rawLocale    = useLocale();
  const locale: "he" | "en" = rawLocale === "he" ? "he" : "en";
  const isRTL        = locale === "he";

  // Context detection from URL
  const pathname     = usePathname();
  const params       = useParams();
  const entityId     = typeof params?.id === "string" ? params.id : "";

  const context: AIContext = pathname.includes("/projects/")
    ? "project"
    : pathname.includes("/clients/")
    ? "client"
    : "generic";

  // UI state
  const [open,        setOpen]        = useState(false);
  const [input,       setInput]       = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [quota,       setQuota]       = useState<AiQuota | null>(null);

  const inputRef    = useRef<HTMLInputElement>(null);
  const bodyRef     = useRef<HTMLDivElement>(null);
  const recTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshQuota = useCallback(() => {
    getAiQuota().then(setQuota).catch(() => {});
  }, []);

  // Chat
  const {
    messages, sendMessage, status, error, setMessages, clearError, addToolOutput,
  } = useChat({
    transport: new DefaultChatTransport({ api: "/api/assistant" }),
    // Resume the model turn automatically once HITL tool results are in.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: refreshQuota,
    // A 403 (quota) also lands here — resync the counter with the server.
    onError: refreshQuota,
  });

  const isBusy        = status === "submitted" || status === "streaming";
  const quotaExceeded = quota !== null && quota.remaining <= 0;

  const u     = UI[locale];
  const chips = CHIPS[context][locale];
  const title = CONTEXT_TITLE[context][locale];

  // Fetch the quota the first time the panel opens
  useEffect(() => {
    if (open && quota === null) refreshQuota();
  }, [open, quota, refreshQuota]);

  // Focus input on open
  useEffect(() => {
    if (open && !isRecording) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, isRecording]);

  // Cleanup recording timer on unmount
  useEffect(() => () => { if (recTimerRef.current) clearTimeout(recTimerRef.current); }, []);

  // Auto-scroll the conversation as messages stream in
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, status]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleOpen()  { setOpen(true); }
  function handleClose() {
    cancelRecording();
    setOpen(false);
    setInput("");
  }
  function handleReset() {
    setMessages([]);
    clearError();
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ask = useCallback((prompt: string) => {
    if (quotaExceeded) return;
    // Optimistic decrement — onFinish/onError resync with the server.
    setQuota((q) =>
      q ? { ...q, used: Math.min(q.used + 1, q.limit), remaining: Math.max(q.remaining - 1, 0) } : q,
    );
    sendMessage(
      { text: prompt },
      { body: { context, entityId, locale } },
    );
  }, [quotaExceeded, sendMessage, context, entityId, locale]);

  function handleSend() {
    const q = input.trim();
    if (!q || isBusy || isRecording || quotaExceeded) return;
    setInput("");
    ask(q);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSend();
  }

  function startVoiceRecording() {
    if (isRecording || isBusy || quotaExceeded) return;
    setInput("");
    setIsRecording(true);
    recTimerRef.current = setTimeout(() => {
      setIsRecording(false);
      const options = MOCK_TRANSCRIPTIONS[locale];
      const transcript = options[Math.floor(Math.random() * options.length)];
      ask(transcript!);
    }, RECORDING_MS);
  }

  function cancelRecording() {
    if (recTimerRef.current) { clearTimeout(recTimerRef.current); recTimerRef.current = null; }
    setIsRecording(false);
  }

  function handleChip(chip: Chip) {
    if ("voice" in chip) {
      startVoiceRecording();
    } else {
      ask(chip.prompt);
    }
  }

  // ── Human-in-the-loop: task approval ──────────────────────────────────────

  async function approveTask(toolCallId: string, draft: TaskDraft) {
    const res = await executeCreateTask({
      title:      draft.title ?? "",
      dueDate:    draft.dueDate ?? "",
      priority:   draft.priority ?? "MEDIUM",
      entityId,
      entityType: context === "client" ? "client" : "project",
    });
    if (res.success) {
      toast.success(u.taskToast);
      addToolOutput({
        tool: "createTask",
        toolCallId,
        output: { status: "created", taskId: res.taskId },
      });
    } else {
      toast.error(u.taskFailedMsg);
      addToolOutput({
        tool: "createTask",
        toolCallId,
        output: { status: "failed", error: res.error },
      });
    }
  }

  function cancelTask(toolCallId: string) {
    addToolOutput({
      tool: "createTask",
      toolCallId,
      output: { status: "cancelled" },
    });
  }

  // ── Human-in-the-loop: daily log approval ─────────────────────────────────

  async function approveDailyLog(toolCallId: string, draft: DailyLogDraft) {
    const res = await executeCreateDailyLog({
      projectId:
        draft.projectId || (context === "project" ? entityId : ""),
      date:           draft.date,
      weather:        draft.weather,
      workforceCount: typeof draft.workforceCount === "number" ? draft.workforceCount : undefined,
      progressNotes:  draft.progressNotes,
      safetyIssues:   draft.safetyIssues,
    });
    if (res.success) {
      toast.success(u.logToast);
      addToolOutput({
        tool: "createDailyLog",
        toolCallId,
        output: { status: "created" },
      });
    } else {
      toast.error(res.error === "duplicate" ? u.logDuplicate : u.logFailedMsg);
      addToolOutput({
        tool: "createDailyLog",
        toolCallId,
        output: {
          status: "failed",
          error: res.error === "duplicate"
            ? "A daily log already exists for this project and date."
            : res.error,
        },
      });
    }
  }

  function cancelDailyLog(toolCallId: string) {
    addToolOutput({
      tool: "createDailyLog",
      toolCallId,
      output: { status: "cancelled" },
    });
  }

  const inputDisabled = isBusy || quotaExceeded;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Collapsed: corner FAB on mobile, text pill on desktop ────────────── */}
      {!open && (
        <>
          {/* Mobile: round FAB at bottom-end corner so it never covers content */}
          <button
            type="button"
            onClick={handleOpen}
            aria-label={u.trigger}
            className={cn(
              "fixed bottom-4 end-4 z-50 sm:hidden",
              "flex h-12 w-12 items-center justify-center rounded-full select-none",
              "bg-gradient-to-br from-violet-600 to-indigo-600 text-white",
              "shadow-xl hover:shadow-[0_8px_30px_rgba(124,58,237,0.4)] hover:scale-105",
              "active:scale-95 transition-all duration-200",
              "animate-in fade-in zoom-in-95 duration-200",
            )}
          >
            <Sparkles className="h-5 w-5" />
          </button>

          {/* Desktop: wide text pill at bottom-center */}
          <button
            type="button"
            onClick={handleOpen}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 hidden sm:flex",
              "items-center gap-2 rounded-full select-none",
              "bg-gradient-to-r from-violet-600 to-indigo-600 text-white",
              "px-5 py-2.5 text-sm font-semibold shadow-xl",
              "hover:shadow-[0_8px_30px_rgba(124,58,237,0.4)] hover:scale-105",
              "active:scale-95 transition-all duration-200",
              "animate-in fade-in zoom-in-95 duration-200",
            )}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            {u.trigger}
          </button>
        </>
      )}

      {/* ── Expanded panel ──────────────────────────────────────────────────── */}
      {open && (
        <div
          dir={isRTL ? "rtl" : "ltr"}
          className={cn(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
            "w-[min(94vw,500px)]",
            "animate-in fade-in slide-in-from-bottom-5 duration-200 ease-out",
          )}
        >
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-background/[0.97] backdrop-blur-2xl">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 bg-gradient-to-r from-violet-50/90 to-indigo-50/70 dark:from-violet-950/30 dark:to-indigo-950/25">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
                  <BotMessageSquare className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-foreground truncate">{title}</span>
                <span className="shrink-0 rounded-full bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-violet-700 dark:text-violet-300">
                  {u.badge}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    aria-label={u.reset}
                    title={u.reset}
                    className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close"
                  className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Body (conversation / hint / recording) ──────────────────── */}
            <div ref={bodyRef} className="px-4 pt-3 pb-2 min-h-[68px] max-h-[320px] overflow-y-auto">
              {isRecording ? (
                /* Recording indicator */
                <div className="flex items-center gap-4 animate-in fade-in duration-150">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                    <span className="absolute h-10 w-10 rounded-full bg-red-400/25 animate-ping" />
                    <span className="absolute h-7 w-7 rounded-full bg-red-400/35 animate-ping [animation-delay:120ms]" />
                    <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-red-500 shadow-sm">
                      <Mic className="h-2.5 w-2.5 text-white" />
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-500">🔴 {u.recording}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {isRTL ? "מעבד אחרי 2.5 שניות..." : "Processing in 2.5 s…"}
                    </p>
                  </div>
                </div>
              ) : messages.length === 0 && !error ? (
                /* Default hint */
                <p className="text-sm text-muted-foreground/80">{u.hint}</p>
              ) : (
                <div className="space-y-2.5">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "animate-in fade-in slide-in-from-bottom-1 duration-200",
                        message.role === "user" ? "flex justify-end" : "",
                      )}
                    >
                      {message.role === "user" ? (
                        <div className="max-w-[85%] rounded-2xl rounded-ee-md bg-gradient-to-br from-violet-600 to-indigo-600 px-3.5 py-2 text-sm leading-relaxed text-white whitespace-pre-wrap">
                          {message.parts
                            .filter((p) => p.type === "text")
                            .map((p) => (p.type === "text" ? p.text : ""))
                            .join("")}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {message.parts.map((part, i) => {
                            if (part.type === "text") {
                              return (
                                <div
                                  key={`${message.id}-${i}`}
                                  className="rounded-xl bg-gradient-to-br from-muted/70 to-muted/30 border border-border/30 px-3.5 py-2.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap"
                                >
                                  {part.text}
                                </div>
                              );
                            }
                            if (part.type === "tool-createTask") {
                              return (
                                <TaskConfirmationCard
                                  key={part.toolCallId}
                                  draft={(part.input ?? {}) as TaskDraft}
                                  ready={
                                    part.state === "input-available" ||
                                    part.state === "approval-requested"
                                  }
                                  outcome={part.output as TaskOutcome}
                                  locale={locale}
                                  onApprove={() => approveTask(part.toolCallId, (part.input ?? {}) as TaskDraft)}
                                  onCancel={() => cancelTask(part.toolCallId)}
                                />
                              );
                            }
                            if (part.type === "tool-createDailyLog") {
                              return (
                                <DailyLogConfirmationCard
                                  key={part.toolCallId}
                                  draft={(part.input ?? {}) as DailyLogDraft}
                                  ready={
                                    part.state === "input-available" ||
                                    part.state === "approval-requested"
                                  }
                                  outcome={part.output as TaskOutcome}
                                  locale={locale}
                                  onApprove={() => approveDailyLog(part.toolCallId, (part.input ?? {}) as DailyLogDraft)}
                                  onCancel={() => cancelDailyLog(part.toolCallId)}
                                />
                              );
                            }
                            if (isToolUIPart(part) && part.state !== "output-available") {
                              return (
                                <div
                                  key={`${message.id}-${i}`}
                                  className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground"
                                >
                                  <Database className="h-3 w-3 animate-pulse" />
                                  {u.checkingData}
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Thinking dots while waiting for the first token */}
                  {status === "submitted" && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                        <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                        <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                      </div>
                      <span>{u.analyzing}</span>
                    </div>
                  )}

                  {/* Error banner */}
                  {error && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
                      {quotaExceeded ? u.errorQuota : u.error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Chips (only before the first message) ───────────────────── */}
            {!isBusy && messages.length === 0 && !isRecording && !quotaExceeded && (
              <div className="flex flex-wrap gap-2 px-4 pb-2 animate-in fade-in duration-200">
                {chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleChip(chip)}
                    className={cn(
                      "rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-xs font-medium",
                      "hover:bg-muted hover:border-border hover:shadow-sm",
                      "active:scale-95 transition-all duration-150",
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Quota counter ───────────────────────────────────────────── */}
            {quota !== null && (
              <div className="px-4 pb-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    quota.remaining <= 0
                      ? "bg-destructive/10 text-destructive"
                      : quota.remaining <= 2
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-violet-500/10 text-violet-600 dark:text-violet-300",
                  )}
                >
                  <Zap className="h-3 w-3" />
                  {quota.remaining <= 0
                    ? u.quotaDone
                    : u.quotaLeft(quota.remaining, quota.limit)}
                </span>
              </div>
            )}

            {/* ── Input row ───────────────────────────────────────────────── */}
            {isRecording ? (
              /* Cancel button during recording */
              <div className="flex justify-center px-4 pb-3">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <MicOff className="h-3 w-3" />
                  {u.cancelRec}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 pb-3">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={inputDisabled}
                  placeholder={quotaExceeded ? u.quotaReached : u.placeholder}
                  className={cn(
                    "min-w-0 flex-1 rounded-xl border border-border/50 bg-muted/30",
                    "px-3.5 py-2 text-sm placeholder:text-muted-foreground/50 outline-none",
                    "focus:border-violet-400/70 focus:ring-1 focus:ring-violet-400/20 transition-all",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                />
                {/* Mic button */}
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  disabled={inputDisabled}
                  aria-label={u.micLabel}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    "border border-border/50 bg-muted/30 text-muted-foreground",
                    "hover:text-foreground hover:bg-muted hover:border-border",
                    "active:scale-95 transition-all duration-150",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                  )}
                >
                  <Mic className="h-3.5 w-3.5" />
                </button>
                {/* Send button */}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={inputDisabled || !input.trim()}
                  aria-label="Send"
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm",
                    "hover:shadow-[0_4px_12px_rgba(124,58,237,0.35)] hover:scale-105",
                    "active:scale-95 transition-all duration-150",
                    "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none",
                  )}
                >
                  <Send className={cn("h-3.5 w-3.5", isRTL && "rotate-180")} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
