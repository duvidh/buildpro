import { Suspense } from "react";
import Link from "next/link";
import { Users, PhoneCall, ExternalLink, Building2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getClients } from "@/actions/clients";

function getInitials(name: string) {
  return name.trim().split(" ").slice(0, 2).map((w) => w[0]).join("");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(date));
}

async function ClientsContent() {
  const clients = await getClients();

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-sm">אין לקוחות עדיין.</p>
        <p className="text-muted-foreground text-xs mt-1">
          המר ליד ללקוח כדי להתחיל.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[220px]">לקוח</TableHead>
            <TableHead>טלפון</TableHead>
            <TableHead className="hidden sm:table-cell">דוא"ל</TableHead>
            <TableHead className="hidden md:table-cell text-center">פרויקטים</TableHead>
            <TableHead className="hidden lg:table-cell">ערך חוזים</TableHead>
            <TableHead className="hidden lg:table-cell">חוב פתוח</TableHead>
            <TableHead className="hidden md:table-cell">נוסף</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const totalContract = client.projects.reduce((s, p) => s + p.contractValue, 0);
            const totalInvoiced = client.invoices.reduce((s, i) => s + i.total, 0);
            const totalPaid = client.invoices.reduce((s, i) => s + i.paidAmount, 0);
            const balance = totalInvoiced - totalPaid;
            const activeProjects = client.projects.filter(
              (p) => p.status === "ACTIVE" || p.status === "PLANNING"
            ).length;

            return (
              <TableRow key={client.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {getInitials(client.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {client.name}
                      </p>
                      {client.contactName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {client.contactName}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {client.phone ? (
                    <a
                      href={`tel:${client.phone}`}
                      className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors"
                      dir="ltr"
                    >
                      <PhoneCall className="h-3.5 w-3.5 opacity-60 shrink-0" />
                      {client.phone}
                    </a>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground truncate max-w-[160px]">
                  {client.email || "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-center">
                  <Badge variant="outline" className="text-xs">
                    {activeProjects} פעיל
                    {client._count.projects > activeProjects && (
                      <span className="text-muted-foreground ms-1">
                        / {client._count.projects}
                      </span>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm font-medium">
                  {totalContract > 0
                    ? `₪${totalContract.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`
                    : "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {balance > 0 ? (
                    <span className="text-sm font-medium text-orange-600">
                      ₪{balance.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                    </span>
                  ) : (
                    <span className="text-sm text-emerald-600">מסולק</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {formatDate(client.createdAt)}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/clients/${client.id}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground leading-none">ניהול לקוחות</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            כרטיס לקוח 360 — פרויקטים, הצעות מחיר וחשבוניות
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <ClientsContent />
      </Suspense>
    </div>
  );
}
