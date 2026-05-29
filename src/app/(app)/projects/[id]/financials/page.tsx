export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getProjectFinancials } from "@/actions/projects";
import { getProjectFinancialSummary } from "@/actions/finance-analytics";
import { FinancialsClient } from "../_components/financials-client";

export default async function ProjectFinancialsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Both queries run in parallel:
  //   tables  → invoice + contract rows for display tables
  //   summary → 5 PostgreSQL aggregate queries (no raw arrays shipped to client)
  const [tables, summary] = await Promise.all([
    getProjectFinancials(id),
    getProjectFinancialSummary(id),
  ]);

  // Either tables or summary being null means the user lacks FINANCE_VIEW access
  if (!tables || !summary) notFound();

  const data = JSON.parse(JSON.stringify({ ...tables, summary }));
  return <FinancialsClient projectId={id} data={data} />;
}
