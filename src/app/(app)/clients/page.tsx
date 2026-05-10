import { Suspense } from "react";
import { Building2 } from "lucide-react";
import { getClients } from "@/actions/clients";
import { ClientsTable } from "@/components/clients/clients-table";
import { NewClientDialog } from "@/components/clients/new-client-dialog";

async function ClientsContent() {
  const clients = await getClients();

  // Serialize Date objects — Client Components cannot receive Date instances as props
  const serializedClients = clients.map((c) => ({
    id: c.id,
    name: c.name,
    contactName: c.contactName,
    email: c.email,
    phone: c.phone,
    phone2: c.phone2,
    address: c.address,
    companyNumber: c.companyNumber,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    _count: c._count,
    projects: c.projects,
    invoices: c.invoices,
  }));

  return <ClientsTable clients={serializedClients} />;
}

export default function ClientsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
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
        <NewClientDialog />
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
