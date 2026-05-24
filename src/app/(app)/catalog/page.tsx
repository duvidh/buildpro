export const dynamic = "force-dynamic";

import { ShoppingBag } from "lucide-react";
import { CatalogManager } from "@/components/catalog/catalog-manager";
import { getCatalogItems } from "@/actions/catalog";

export default async function CatalogPage() {
  const items = await getCatalogItems();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 shrink-0">
          <ShoppingBag className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">קטלוג פריטים</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ניהול מחירון, יחידות מידה וקטגוריות
          </p>
        </div>
      </div>

      <CatalogManager initialItems={items} />
    </div>
  );
}
