"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createQuote } from "@/actions/quotes";
import { toast } from "sonner";

export function CreateQuoteButton({ clientId }: { clientId: string }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const res = await createQuote({ clientId });
      if (res.success) {
        toast.success("הצעת מחיר נוצרה");
        // Open the new quote directly in the split-view — no page navigation
        router.push(`${pathname}?selectedQuoteId=${res.quoteId}`, { scroll: false });
      } else {
        toast.error("שגיאה ביצירת הצעת מחיר");
      }
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8 gap-1.5"
      onClick={handleCreate}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Plus className="h-3.5 w-3.5" />
      )}
      צור הצעת מחיר
    </Button>
  );
}
