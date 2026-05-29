"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface HardDeleteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Exact name the user must type to unlock the delete button */
  itemName: string;
  /** Locale-aware noun — e.g. t("header.deleteItemKind") from the caller */
  itemKind: string;
  /** What will be permanently deleted — shown as bullet list */
  cascadeList: string[];
  /** Called when the user clicks the final destructive button */
  onConfirm: () => void;
  isPending: boolean;
}

/**
 * GitHub-style hard-delete dialog.
 * The destructive submit button stays disabled until the user
 * types the exact name of the item being deleted.
 */
export function HardDeleteDialog({
  open,
  onOpenChange,
  itemName,
  itemKind,
  cascadeList,
  onConfirm,
  isPending,
}: HardDeleteDialogProps) {
  const t      = useTranslations("hardDelete");
  const locale = useLocale();
  const dir    = locale === "he" ? "rtl" : "ltr";

  const [typed, setTyped] = useState("");
  const confirmed = typed === itemName;

  function handleOpenChange(v: boolean) {
    if (!v) setTyped(""); // reset on close
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" dir={dir}>
        <DialogHeader>
          {/* Warning icon + destructive title */}
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="text-base font-bold text-destructive leading-snug">
              {t("title")}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Main warning */}
          <p className="text-foreground leading-relaxed">
            {t("warning", { itemKind, itemName: `"${itemName}"` })}{" "}
            <span className="text-destructive font-medium">{t("cantUndo")}</span>
          </p>

          {/* Cascade list */}
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-2">
              {t("willBeDeleted")}
            </p>
            <ul className="space-y-1">
              {cascadeList.map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-foreground/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Confirmation input */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-input" className="text-xs text-muted-foreground leading-relaxed">
              {t("typeToConfirm")}{" "}
              <span
                className="font-mono font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded text-[11px]"
                dir="auto"
              >
                {itemName}
              </span>
            </Label>
            <Input
              id="confirm-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={itemName}
              autoComplete="off"
              className={
                typed.length > 0 && !confirmed
                  ? "border-destructive/60 focus-visible:ring-destructive/30"
                  : confirmed
                  ? "border-emerald-500/60 focus-visible:ring-emerald-400/30"
                  : ""
              }
              dir="auto"
            />
            {typed.length > 0 && !confirmed && (
              <p className="text-[11px] text-destructive mt-1">
                {t("nameMismatch")}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 justify-end pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={!confirmed || isPending}
            className="gap-1.5 min-w-[100px]"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("deleting")}
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("deleteForever")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
