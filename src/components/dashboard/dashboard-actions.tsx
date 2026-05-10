"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewLeadDialog } from "@/components/leads/new-lead-dialog";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";

type ClientOption = { id: string; name: string; address: string };

export function DashboardActions({ clientOptions }: { clientOptions: ClientOption[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      <NewLeadDialog />
      <NewProjectDialog clients={clientOptions} />
      <Button asChild size="sm" variant="outline">
        <Link href="/tasks">
          <Plus className="h-4 w-4 me-1.5" />
          משימות
        </Link>
      </Button>
    </div>
  );
}
