import { QuotesContent } from "@/components/quotes/quotes-content";
import { getQuotes } from "@/actions/quotes";
import { getClients } from "@/actions/clients";
import { getLeadsForSelect } from "@/actions/leads";

export default async function QuotesPage() {
  const [quotes, clients, leads] = await Promise.all([
    getQuotes(),
    getClients(),
    getLeadsForSelect(),
  ]);
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  return <QuotesContent quotes={quotes} clients={clientOptions} leads={leads} />;
}
