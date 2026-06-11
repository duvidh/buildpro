"use client";

import Link from "next/link";
import { Printer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Floating print controls — hidden in the printed output. */
export function PrintButton({
  quoteId,
  printLabel,
  backLabel,
}: {
  quoteId: string;
  printLabel: string;
  backLabel: string;
}) {
  return (
    <div className="sticky top-2 z-30 mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/95 px-2 py-1.5 shadow-lg backdrop-blur-sm print:hidden">
      <Button size="sm" className="h-8 gap-1.5 rounded-full" onClick={() => window.print()}>
        <Printer className="h-3.5 w-3.5" />
        {printLabel}
      </Button>
      <Button size="sm" variant="ghost" asChild className="h-8 gap-1 rounded-full text-muted-foreground">
        <Link href={`/quotes/${quoteId}`}>
          <ArrowRight className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      </Button>
    </div>
  );
}
