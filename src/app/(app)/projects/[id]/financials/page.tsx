export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getProjectFinancials } from "@/actions/projects";
import { getProjectFinancialSummary } from "@/actions/finance-analytics";
import { getProjectHeader } from "@/actions/projects";
import { FinancialsClient } from "../_components/financials-client";

export default async function ProjectFinancialsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Verify the project itself exists before running finance queries
  const project = await getProjectHeader(id);
  if (!project) notFound();

  // Both queries run in parallel:
  //   tables  → invoice + contract rows for display tables
  //   summary → 5 PostgreSQL aggregate queries (no raw arrays shipped to client)
  const [tables, summary, t] = await Promise.all([
    getProjectFinancials(id),
    getProjectFinancialSummary(id),
    getTranslations("projects"),
  ]);

  // null means the caller lacks FINANCE_VIEW access — show a friendly gate
  if (!tables || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">{t("financials.accessDeniedTitle")}</p>
        <p className="text-xs text-muted-foreground max-w-xs">{t("financials.accessDeniedBody")}</p>
      </div>
    );
  }

  const data = JSON.parse(JSON.stringify({ ...tables, summary }));
  return <FinancialsClient projectId={id} data={data} />;
}
