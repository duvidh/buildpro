export const dynamic = "force-dynamic";

import { ShoppingBag } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CatalogManager } from "@/components/catalog/catalog-manager";
import { getCatalogItems } from "@/actions/catalog";

export default async function CatalogPage() {
  const [items, t] = await Promise.all([
    getCatalogItems(),
    getTranslations("catalog"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 shrink-0">
          <ShoppingBag className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      <CatalogManager initialItems={items} />
    </div>
  );
}
