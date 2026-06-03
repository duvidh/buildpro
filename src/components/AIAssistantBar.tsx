"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { usePathname, useParams } from "next/navigation";
import {
  Sparkles, X, Send, BotMessageSquare, RotateCcw, Mic, MicOff,
} from "lucide-react";
import { askProjectAI, type AIContext } from "@/actions/ai";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type RegularChip = { label: string; prompt: string };
type VoiceChip   = { label: string; voice: true };
type Chip = RegularChip | VoiceChip;

// ─── Static data ──────────────────────────────────────────────────────────────

const CHIPS: Record<AIContext, Record<"he" | "en", Chip[]>> = {
  project: {
    he: [
      { label: "💰 סטטוס תשלומים ופרויקט", prompt: "תשלומים סטטוס" },
      { label: "➕ צור משימה למחר",          prompt: "משימה ליצור"  },
      { label: "📱 נסח WhatsApp ללקוח",      prompt: "whatsapp"     },
      { label: "🎙️ הקלט משימה/דיווח",       voice: true            },
    ],
    en: [
      { label: "💰 Payments & Status", prompt: "payments status" },
      { label: "➕ Create Task",        prompt: "create task"    },
      { label: "📱 Draft WhatsApp",     prompt: "whatsapp"       },
      { label: "🎙️ Record Voice",      voice: true              },
    ],
  },
  client: {
    he: [
      { label: "💰 סיכום חובות",      prompt: "חובות"    },
      { label: "📄 חשבוניות פתוחות", prompt: "חשבוניות" },
      { label: "🤝 היסטוריית לקוח",  prompt: "היסטוריה" },
      { label: "🎙️ הקלט הערה",       voice: true        },
    ],
    en: [
      { label: "💰 Outstanding Balance", prompt: "balance"  },
      { label: "📄 Open Invoices",        prompt: "invoices" },
      { label: "🤝 Client History",       prompt: "history"  },
      { label: "🎙️ Record Note",         voice: true        },
    ],
  },
  generic: {
    he: [
      { label: "📊 מצב תקציב",    prompt: "תקציב"  },
      { label: "⚠️ חוסר בחומרים", prompt: "חומרים" },
      { label: "🎙️ דיווח שטח",   voice: true       },
    ],
    en: [
      { label: "📊 Budget Status",        prompt: "budget"    },
      { label: "⚠️ Material Shortages",  prompt: "materials" },
      { label: "🎙️ Field Report",        voice: true         },
    ],
  },
};

// Two flavours per locale — one task-oriented, one log-oriented — picked at random.
const MOCK_TRANSCRIPTIONS: Record<"he" | "en", readonly string[]> = {
  he: [
    "שים לב, צריך לפתוח משימה דחופה למחר: להביא צינורות 4 צול לאינסטלטור.",
    "התקדמות יפה היום בשטח, סיימנו ריצוף קומה א׳. הכל תקין, ממשיכים מחר.",
  ],
  en: [
    "Urgent task for tomorrow: bring 4-inch pipes for the plumber — mark it critical.",
    "Good progress on site today, finished tiling floor 1. All good, continuing tomorrow.",
  ],
};

const CONTEXT_TITLE = {
  project: { he: "עוזר פרויקט AI",   en: "AI Project Assistant" },
  client:  { he: "עוזר לקוח AI",     en: "AI Client Assistant"  },
  generic: { he: "עוזר AI חכם",      en: "AI Assistant"         },
} as const;

const UI = {
  he: {
    trigger:    "✨ שאל את עוזר ה-AI",
    badge:      "POC",
    placeholder:"שאל שאלה חופשית...",
    hint:       "בחר נושא מהירושים למטה, או כתוב שאלה.",
    analyzing:  "מנתח נתונים...",
    reset:      "שאלה חדשה",
    recording:  "מקליט...",
    cancelRec:  "ביטול הקלטה",
    micLabel:   "הקלט הודעה קולית",
  },
  en: {
    trigger:    "✨ Ask AI Assistant",
    badge:      "POC",
    placeholder:"Ask a free-form question...",
    hint:       "Pick a topic below, or type a question.",
    analyzing:  "Analyzing data…",
    reset:      "New question",
    recording:  "Recording...",
    cancelRec:  "Cancel",
    micLabel:   "Record voice message",
  },
} as const;

const RECORDING_MS = 2500;

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
  const [response,    setResponse]    = useState<string | null>(null);
  const [input,       setInput]       = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPending,   startTrans]     = useTransition();

  const inputRef       = useRef<HTMLInputElement>(null);
  const recTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const u     = UI[locale];
  const chips = CHIPS[context][locale];
  const title = CONTEXT_TITLE[context][locale];

  // Focus input on open
  useEffect(() => {
    if (open && !isRecording) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, isRecording]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cleanup recording timer on unmount
  useEffect(() => () => { if (recTimerRef.current) clearTimeout(recTimerRef.current); }, []);

  // Reset response + chips when navigating to a different context
  useEffect(() => { setResponse(null); }, [context]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleOpen()  { setOpen(true); }
  function handleClose() {
    cancelRecording();
    setOpen(false);
    setResponse(null);
    setInput("");
  }
  function handleReset() {
    setResponse(null);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  const ask = useCallback((prompt: string) => {
    setResponse(null);
    startTrans(async () => {
      const result = await askProjectAI(prompt, entityId, context, locale);
      setResponse(result);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, context, locale]);

  function handleSend() {
    const q = input.trim();
    if (!q || isPending || isRecording) return;
    setInput("");
    ask(q);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSend();
  }

  function startVoiceRecording() {
    if (isRecording || isPending) return;
    setResponse(null);
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Collapsed pill ──────────────────────────────────────────────────── */}
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          className={cn(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
            "flex items-center gap-2 rounded-full select-none",
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
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Body (response / hint / recording) ──────────────────────── */}
            <div className="px-4 pt-3 pb-2 min-h-[68px] max-h-[320px] overflow-y-auto">
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
              ) : isPending ? (
                /* Thinking dots */
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span>{u.analyzing}</span>
                </div>
              ) : response ? (
                /* AI response */
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-250">
                  <div className="rounded-xl bg-gradient-to-br from-muted/70 to-muted/30 border border-border/30 px-3.5 py-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap font-[inherit]">
                    {response}
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {u.reset}
                  </button>
                </div>
              ) : (
                /* Default hint */
                <p className="text-sm text-muted-foreground/80">{u.hint}</p>
              )}
            </div>

            {/* ── Chips ───────────────────────────────────────────────────── */}
            {!isPending && !response && !isRecording && (
              <div className="flex flex-wrap gap-2 px-4 pb-3 animate-in fade-in duration-200">
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
                  disabled={isPending}
                  placeholder={u.placeholder}
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
                  disabled={isPending}
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
                  disabled={isPending || !input.trim()}
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
