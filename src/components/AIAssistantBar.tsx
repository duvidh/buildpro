"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { Sparkles, X, Send, Loader2, BotMessageSquare, RotateCcw } from "lucide-react";
import { askProjectAI } from "@/actions/ai";
import { cn } from "@/lib/utils";

// ─── Static content ────────────────────────────────────────────────────────────

const CHIPS = {
  he: [
    { label: "📊 מה מצב התקציב?",  prompt: "תקציב"      },
    { label: "⚠️ חוסר בחומרים?",  prompt: "חומרים"     },
    { label: "🎙️ דיווח שטח חדש", prompt: "דיווח שטח"  },
  ],
  en: [
    { label: "📊 Budget Status?",     prompt: "budget"    },
    { label: "⚠️ Material Shortages?", prompt: "materials" },
    { label: "🎙️ New Daily Log",     prompt: "field log" },
  ],
} as const;

const TEXT = {
  he: {
    trigger:     "✨ שאל את עוזר ה-AI",
    title:       "עוזר פרויקט AI",
    badge:       "POC",
    placeholder: "שאל שאלה חופשית...",
    hint:        "בחר נושא מהירושים למטה, או כתוב שאלה.",
    analyzing:   "מנתח נתונים...",
    reset:       "שאלה חדשה",
  },
  en: {
    trigger:     "✨ Ask AI Assistant",
    title:       "AI Project Assistant",
    badge:       "POC",
    placeholder: "Ask a free-form question...",
    hint:        "Pick a topic from the chips below, or type a question.",
    analyzing:   "Analyzing data…",
    reset:       "New question",
  },
} as const;

// ─── Component ─────────────────────────────────────────────────────────────────

export function AIAssistantBar({ projectId }: { projectId: string }) {
  const rawLocale = useLocale();
  const locale: "he" | "en" = rawLocale === "he" ? "he" : "en";
  const isRTL = locale === "he";

  const [open, setOpen]           = useState(false);
  const [response, setResponse]   = useState<string | null>(null);
  const [input, setInput]         = useState("");
  const [isPending, startTrans]   = useTransition();
  const inputRef                  = useRef<HTMLInputElement>(null);
  const panelRef                  = useRef<HTMLDivElement>(null);

  const t     = TEXT[locale];
  const chips = CHIPS[locale];

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleOpen()  { setOpen(true); }
  function handleClose() { setOpen(false); setResponse(null); setInput(""); }
  function handleReset() { setResponse(null); setInput(""); setTimeout(() => inputRef.current?.focus(), 80); }

  function ask(prompt: string) {
    setResponse(null);
    startTrans(async () => {
      const result = await askProjectAI(prompt, projectId, locale);
      setResponse(result);
    });
  }

  function handleSend() {
    const q = input.trim();
    if (!q || isPending) return;
    setInput("");
    ask(q);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSend();
  }

  return (
    <>
      {/* ── Collapsed trigger pill ───────────────────────────────────────────── */}
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          className={cn(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
            "flex items-center gap-2 rounded-full",
            "bg-gradient-to-r from-violet-600 to-indigo-600 text-white",
            "px-5 py-2.5 text-sm font-semibold shadow-xl",
            "hover:shadow-violet-500/30 hover:shadow-2xl hover:scale-105",
            "active:scale-95 transition-all duration-200 select-none",
            "animate-in fade-in zoom-in-95 duration-200",
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          {t.trigger}
        </button>
      )}

      {/* ── Expanded panel ───────────────────────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          dir={isRTL ? "rtl" : "ltr"}
          className={cn(
            "fixed bottom-6 left-1/2 z-50 w-[min(92vw,480px)] -translate-x-1/2",
            "animate-in fade-in slide-in-from-bottom-4 duration-250 ease-out",
          )}
        >
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-background/96 backdrop-blur-2xl">

            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 bg-gradient-to-r from-violet-50/80 to-indigo-50/70 dark:from-violet-950/30 dark:to-indigo-950/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
                  <BotMessageSquare className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-foreground truncate">
                  {t.title}
                </span>
                <span className="rounded-full bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-violet-700 dark:text-violet-300 shrink-0">
                  {t.badge}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Response / hint area */}
            <div className="px-4 pt-3 pb-2 min-h-[72px]">
              {isPending ? (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  {/* Typing dots animation */}
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span>{t.analyzing}</span>
                </div>
              ) : response ? (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
                  <div className="rounded-xl bg-gradient-to-br from-muted/60 to-muted/30 border border-border/30 px-3.5 py-3 text-sm leading-relaxed text-foreground">
                    {response}
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t.reset}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/80">{t.hint}</p>
              )}
            </div>

            {/* Quick-prompt chips */}
            {!isPending && !response && (
              <div className="flex flex-wrap gap-2 px-4 pb-3 animate-in fade-in duration-200">
                {chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => ask(chip.prompt)}
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

            {/* Input row */}
            <div className="flex items-center gap-2 px-3 pb-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isPending}
                placeholder={t.placeholder}
                className={cn(
                  "min-w-0 flex-1 rounded-xl border border-border/50 bg-muted/30 px-3.5 py-2 text-sm",
                  "placeholder:text-muted-foreground/50 outline-none",
                  "focus:border-violet-400/70 focus:ring-1 focus:ring-violet-400/20 transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isPending || !input.trim()}
                aria-label="Send"
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm",
                  "hover:shadow-violet-500/25 hover:shadow-lg hover:scale-105",
                  "active:scale-95 transition-all duration-150",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none",
                )}
              >
                <Send className={cn("h-3.5 w-3.5", isRTL && "rotate-180")} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
