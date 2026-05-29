"use client";

import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewLeadDialog } from "@/components/leads/new-lead-dialog";

export function DashboardActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <NewLeadDialog />
      <Button asChild size="sm" variant="outline">
        <Link href="/projects/new">
          <FolderKanban className="h-4 w-4 me-1.5" />
          פרויקט חדש
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href="/tasks">
          <Plus className="h-4 w-4 me-1.5" />
          משימות
        </Link>
      </Button>
    </div>
  );
}
