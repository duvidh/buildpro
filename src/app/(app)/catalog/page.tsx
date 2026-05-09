import { CatalogManager } from "@/components/catalog/catalog-manager";
import { getCatalogItems } from "@/actions/catalog";

export default async function CatalogPage() {
  const items = await getCatalogItems();
  return <CatalogManager initialItems={items} />;
}
