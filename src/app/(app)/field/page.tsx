export const dynamic = "force-dynamic";

import { getActiveProjects, getEmployees } from "@/actions/field";
import { FieldPageClient } from "@/components/field/field-page-client";

export default async function FieldPage() {
  const [projects, employees] = await Promise.all([
    getActiveProjects(),
    getEmployees(),
  ]);

  return <FieldPageClient projects={projects} employees={employees} />;
}
