export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getClientHeader } from "@/actions/clients";
import { getSession } from "@/lib/session";
import type { UserRole } from "@/lib/auth-utils";
import { DELETE_ROLES } from "@/lib/auth-utils";
import { ClientHeader } from "./_components/client-header";
import { ClientTabsNav } from "./_components/client-tabs-nav";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [client, session] = await Promise.all([
    getClientHeader(id),
    getSession(),
  ]);
  if (!client) notFound();

  if (!session) redirect("/login");
  const userRole = session.role as UserRole;
  const canDelete = DELETE_ROLES.includes(userRole);

  return (
    <div className="-mt-4 -mx-4 sm:-mt-6 sm:-mx-6 flex flex-col min-h-full">
      {/* ── Sticky command-center header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/60">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <ClientHeader client={client} canDelete={canDelete} />
        </div>
        <div className="px-4 sm:px-6">
          <ClientTabsNav clientId={id} counts={client._count} />
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="px-4 sm:px-6 py-6 flex-1">{children}</div>
    </div>
  );
}
