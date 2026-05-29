export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getClients } from "@/actions/clients";
import { ClientsTable } from "@/components/clients/clients-table";
import { Button } from "@/components/ui/button";

async function ClientsContent() {
  const clients = await getClients();

  const serializedClients = clients.map((c) => ({
    id:            c.id,
    name:          c.name,
    contactName:   c.contactName,
    email:         c.email,
    phone:         c.phone,
    phone2:        c.phone2,
    address:       c.address,
    companyNumber: c.companyNumber,
    notes:         c.notes,
    createdAt:     c.createdAt.toISOString(),
    _count:        c._count,
    projects:      c.projects,
    invoices:      c.invoices,
  }));

  return <ClientsTable clients={serializedClients} />;
}

export default async function ClientsPage() {
  const t = await getTranslations("clients.page");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground leading-none">{t("title")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("subtitle")}</p>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link href="/clients/new">
            <Plus className="h-4 w-4 me-1.5" />
            {t("newClient")}
          </Link>
        </Button>
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
