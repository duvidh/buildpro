export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getInvoiceById } from "@/actions/invoices";
import { getCurrencyCode } from "@/actions/settings";
import { getTranslations, getLocale } from "next-intl/server";
import { InvoiceDetailClient } from "./_components/invoice-detail-client";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, currencyCode] = await Promise.all([
    getInvoiceById(id),
    getCurrencyCode(),
  ]);

  if (!invoice) notFound();

  const [t, locale] = await Promise.all([
    getTranslations("clients"),
    getLocale(),
  ]);

  // Serialize Dates for the client component.
  const data = JSON.parse(JSON.stringify(invoice));

  return (
    <InvoiceDetailClient
      invoice={data}
      currencyCode={currencyCode}
      locale={locale}
    />
  );
}
