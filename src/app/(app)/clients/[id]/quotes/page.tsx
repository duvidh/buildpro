export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getClientHeader, getClientQuotes } from "@/actions/clients";
import { getQuoteById } from "@/actions/quotes";
import { getCatalogItems } from "@/actions/catalog";
import { QuotesSplitClient } from "./_components/quotes-split-client";

export default async function ClientQuotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp     = await searchParams;
  const selectedQuoteId =
    typeof sp.selectedQuoteId === "string" ? sp.selectedQuoteId : null;

  const [client, quotes] = await Promise.all([
    getClientHeader(id),
    getClientQuotes(id),
  ]);
  if (!client) notFound();

  // If a quote is selected, fetch its full data + catalog items for the editor
  let selectedQuote: Awaited<ReturnType<typeof getQuoteById>> = null;
  let catalogItems: Awaited<ReturnType<typeof getCatalogItems>> = [];

  if (selectedQuoteId) {
    [selectedQuote, catalogItems] = await Promise.all([
      getQuoteById(selectedQuoteId),
      getCatalogItems(),
    ]);
  }

  // Serialise dates → strings for client components
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = JSON.parse(JSON.stringify({ quotes, selectedQuote, catalogItems }));

  return (
    <QuotesSplitClient
      clientId={id}
      clientName={client.name}
      quotes={data.quotes}
      selectedQuoteId={selectedQuoteId}
      selectedQuote={data.selectedQuote}
      catalogItems={data.catalogItems}
    />
  );
}
