import { QuotesContent } from "@/components/quotes/quotes-content";
import { getQuotes } from "@/actions/quotes";
import { getClients } from "@/actions/clients";

export default async function QuotesPage() {
  const [quotes, clients] = await Promise.all([getQuotes(), getClients()]);
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  return <QuotesContent quotes={quotes} clients={clientOptions} />;
}
