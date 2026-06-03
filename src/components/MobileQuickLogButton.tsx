"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ClipboardList, CloudSun, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { createQuickDailyLog } from "@/actions/field";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function weatherSuggestions(): string[] {
  const month = new Date().getMonth();
  if (month >= 5 && month <= 8) return ["☀️ ~32°C", "🌡️ ~36°C", "⛅ ~30°C"];
  if (month === 9 || month === 10) return ["🌤️ ~22°C", "⛅ ~18°C", "🌧️ ~16°C"];
  if (month === 11 || month <= 1) return ["🌧️ ~12°C", "🌦️ ~14°C", "☁️ ~10°C"];
  return ["🌸 ~20°C", "☀️ ~24°C", "🌤️ ~18°C"];
}

export function MobileQuickLogButton({ projectId }: { projectId: string }) {
  const t = useTranslations("quickLog");
  const [open, setOpen] = useState(false);
  const [weather, setWeather] = useState("");
  const [showWeatherPicker, setShowWeatherPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setWeather("");
    setNotes("");
    setShowWeatherPicker(false);
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createQuickDailyLog({
        projectId,
        notes: notes || undefined,
        weather: weather || undefined,
      });
      if (!result.success) {
        toast.error(
          result.error === "duplicate" ? t("errorDuplicate") : t("errorGeneric")
        );
        return;
      }
      toast.success(t("toastSuccess"));
      handleClose();
    });
  }

  return (
    <>
      {/* FAB — mobile/tablet only */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t("fabLabel")}
        className="fixed bottom-6 start-6 z-40 md:hidden flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary/90 active:scale-95 transition-all touch-manipulation"
      >
        <ClipboardList className="h-6 w-6" />
      </button>

      {/* Bottom Sheet */}
      <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <SheetContent
          side="bottom"
          className="max-h-[90svh] overflow-y-auto rounded-t-2xl px-0 pb-safe"
          dir="rtl"
        >
          <SheetHeader className="px-5 pb-3">
            <SheetTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              {t("title")}
            </SheetTitle>
          </SheetHeader>

          <div className="px-5 pb-8 space-y-5">
            {/* Date — read-only today */}
            <div className="flex items-center gap-3">
              <Label className="text-xs text-muted-foreground w-20 shrink-0">
                {t("date")}
              </Label>
              <Input
                type="date"
                value={todayIso()}
                readOnly
                className="h-9 text-sm max-w-[160px] bg-muted/50 cursor-default"
                dir="ltr"
              />
            </div>

            {/* Weather */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CloudSun className="h-3.5 w-3.5" />
                {t("weather")}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  placeholder={t("weatherPlaceholder")}
                  className="h-10 text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0 text-xs px-3"
                  onClick={() => setShowWeatherPicker((v) => !v)}
                >
                  {t("autoFill")}
                </Button>
              </div>
              {showWeatherPicker && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {weatherSuggestions().map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setWeather(opt);
                        setShowWeatherPicker(false);
                      }}
                      className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm hover:bg-muted transition-colors touch-manipulation"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notes — large textarea optimised for thumb typing */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                {t("notes")}
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                rows={6}
                className="text-base resize-none leading-relaxed"
              />
            </div>

            {/* Submit */}
            <Button
              type="button"
              className="w-full h-12 text-base font-medium"
              disabled={isPending}
              onClick={handleSubmit}
            >
              {isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
