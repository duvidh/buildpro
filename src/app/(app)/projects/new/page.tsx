export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getClients } from "@/actions/clients";
import { NewProjectForm } from "./_components/new-project-form";

export default async function NewProjectPage() {
  const [rawClients, t] = await Promise.all([
    getClients(),
    getTranslations("projects"),
  ]);

  const clients = rawClients.map((c) => ({
    id:      c.id,
    name:    c.name,
    address: c.address ?? "",
  }));

  return (
    <div className="w-full space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
          <Link href="/projects">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <FolderKanban className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground leading-tight">{t("new.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("new.subtitle")}</p>
        </div>
      </div>

      <NewProjectForm clients={clients} />
    </div>
  );
}
