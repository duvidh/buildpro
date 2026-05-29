export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getFieldPageData, getEmployees } from "@/actions/field";
import { FieldClient } from "../_components/field-client";

export default async function ProjectFieldPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [raw, employees] = await Promise.all([
    getFieldPageData(id),
    getEmployees(),
  ]);
  if (!raw) notFound();
  // Serialize dates for client component
  const data = JSON.parse(JSON.stringify({ ...raw, employees }));
  return <FieldClient data={data} />;
}
