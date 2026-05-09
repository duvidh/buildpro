"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PhoneCall, UserCheck, Loader2 } from "lucide-react";
import type { LeadStatusValue } from "@/components/leads/lead-status-badge";
import { updateLeadStatus, convertLeadToClient } from "@/actions/leads";
import { LEAD_STATUS_VALUES } from "@/lib/constants/lead-enums";
import {
  LeadStatusBadge,
  LeadUrgencyBadge,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_CONFIG,
} from "./lead-status-badge";

type Lead = {
  id: string;
  name: string;
  phone: string;
  phone2: string | null;
  propertyAddress: string | null;
  source: string;
  status: LeadStatusValue;
  urgency: string;
  budget: number | null;
  convertedToId: string | null;
  createdAt: Date;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function StatusDropdown({ lead }: { lead: Lead }) {
  const [, startTransition] = useTransition();

  function changeStatus(status: LeadStatusValue) {
    startTransition(() => { updateLeadStatus(lead.id, status); });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="cursor-pointer">
          <LeadStatusBadge status={lead.status} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">שינוי סטטוס</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LEAD_STATUS_VALUES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => changeStatus(s)}
            className={lead.status === s ? "font-semibold" : ""}
          >
            <LeadStatusBadge status={s} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConvertButton({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (lead.status === "CONVERTED" || lead.convertedToId) {
    return (
      <span className="text-xs text-emerald-600 flex items-center gap-1">
        <UserCheck className="h-3.5 w-3.5" /> לקוח
      </span>
    );
  }

  function handleConvert() {
    startTransition(async () => {
      const res = await convertLeadToClient(lead.id);
      if (res.success) router.push(`/clients/${res.clientId}`);
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
      onClick={handleConvert}
      disabled={isPending}
    >
      {isPending
        ? <Loader2 className="h-3 w-3 animate-spin" />
        : <UserCheck className="h-3 w-3" />
      }
      המר
    </Button>
  );
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-sm">אין לידים במערכת עדיין.</p>
        <p className="text-muted-foreground text-xs mt-1">לחץ על "ליד חדש" כדי להוסיף את הראשון.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[180px]">שם</TableHead>
            <TableHead>טלפון</TableHead>
            <TableHead className="hidden md:table-cell">כתובת נכס</TableHead>
            <TableHead className="hidden sm:table-cell">מקור</TableHead>
            <TableHead>דחיפות</TableHead>
            <TableHead>סטטוס</TableHead>
            <TableHead className="hidden lg:table-cell">תקציב</TableHead>
            <TableHead className="hidden md:table-cell">תאריך</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className="group">
              <TableCell className="font-medium">{lead.name}</TableCell>
              <TableCell>
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors"
                  dir="ltr"
                >
                  <PhoneCall className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  {lead.phone}
                </a>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[160px] truncate">
                {lead.propertyAddress || "—"}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                {LEAD_SOURCE_LABELS[lead.source] ?? lead.source}
              </TableCell>
              <TableCell><LeadUrgencyBadge urgency={lead.urgency} /></TableCell>
              <TableCell><StatusDropdown lead={lead} /></TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                {lead.budget ? `₪${lead.budget.toLocaleString("he-IL")}` : "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {formatDate(lead.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 justify-end">
                  <ConvertButton lead={lead} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>צפה בפרטים</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        מחק ליד
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
