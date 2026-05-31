"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, PhoneCall, MoreHorizontal, UserCheck,
  Loader2, Trash2, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { convertLeadToClient, deleteLead, updateLeadStatus } from "@/actions/leads";
import { LEAD_STATUS_CONFIG } from "@/components/leads/lead-status-badge";
import { LEAD_STATUS_VALUES, type LeadStatusValue } from "@/lib/constants/lead-enums";

function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? "972" + digits.slice(1) : digits;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type LeadHeaderProps = {
  lead: {
    id: string;
    name: string;
    phone: string;
    status: LeadStatusValue;
    source: string;
    convertedToId: string | null;
  };
};

export function LeadHeader({ lead }: LeadHeaderProps) {
  const t      = useTranslations("leads");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [isConverting, startConvert] = useTransition();
  const [isChangingStatus, startStatusChange] = useTransition();

  const statusCfg = LEAD_STATUS_CONFIG[lead.status] ?? LEAD_STATUS_CONFIG.NEW;
  const isConverted = lead.status === "CONVERTED" || !!lead.convertedToId;

  function handleStatusChange(status: LeadStatusValue) {
    startStatusChange(async () => {
      await updateLeadStatus(lead.id, status);
      toast.success(t("table.toastStatusUpdated"));
      router.refresh();
    });
  }

  function handleConvert() {
    startConvert(async () => {
      const res = await convertLeadToClient(lead.id);
      if (res.success) {
        toast.success(t("header.convertSuccess"));
        router.push(`/clients/${res.clientId}`);
      } else {
        toast.error(t("header.convertError"));
      }
    });
  }

  function handleDelete() {
    startDelete(async () => {
      const res = await deleteLead(lead.id);
      if (res.success) {
        toast.success(t("table.toastDeleted"));
        router.push("/leads");
      } else {
        toast.error(t("header.deleteError"));
        setShowDeleteDialog(false);
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        {/* ── Left: back + identity ── */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/leads"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-foreground leading-tight truncate">
                {lead.name}
              </h1>
              {/* Status selector — inline quick change */}
              <Select
                value={lead.status}
                onValueChange={(v) => handleStatusChange(v as LeadStatusValue)}
                disabled={isChangingStatus}
              >
                <SelectTrigger className={`h-6 px-2 py-0 text-xs border rounded-full w-auto gap-1 ${statusCfg.className}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  {LEAD_STATUS_VALUES.map((s) => {
                    const cfg = LEAD_STATUS_CONFIG[s];
                    return (
                      <SelectItem key={s} value={s}>
                        <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                          {(() => { try { return t(`status.${s}` as Parameters<typeof t>[0]); } catch { return s; } })()}
                        </Badge>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {(() => { try { return t(`source.${lead.source}` as Parameters<typeof t>[0]); } catch { return lead.source; } })()}
              </span>
            </div>
          </div>
        </div>

        {/* ── Right: phone + actions ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Phone */}
          <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5" dir="ltr">
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors"
            >
              <PhoneCall className="h-3.5 w-3.5 opacity-60" />
              {lead.phone}
            </a>
            <a
              href={`https://wa.me/${toWhatsAppNumber(lead.phone)}`}
              target="_blank"
              rel="noopener noreferrer"
              title={t("table.whatsapp")}
              className="text-[#25D366] hover:opacity-80 transition-opacity"
            >
              <WhatsAppIcon />
            </a>
          </div>

          {/* Convert or client link */}
          {isConverted ? (
            lead.convertedToId ? (
              <Link
                href={`/clients/${lead.convertedToId}`}
                className={buttonVariants({ variant: "outline", size: "sm" }) + " h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"}
              >
                <UserCheck className="h-3.5 w-3.5" />
                {t("header.viewClient")}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Link>
            ) : (
              <span className="text-xs text-emerald-600 flex items-center gap-1 px-2">
                <UserCheck className="h-3.5 w-3.5" /> {t("header.alreadyConverted")}
              </span>
            )
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={handleConvert}
              disabled={isConverting}
            >
              {isConverting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <UserCheck className="h-3.5 w-3.5" />}
              {t("header.convertToClient")}
            </Button>
          )}

          {/* More actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 me-2" />
                {t("table.deleteLead")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("table.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("header.confirmDeleteDesc", { name: lead.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
