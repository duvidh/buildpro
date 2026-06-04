export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getInvoiceById } from "@/actions/invoices";
import { getCurrencyCode, getSystemSettings } from "@/actions/settings";
import { getTranslations, getLocale } from "next-intl/server";
import { InvoiceDetailClient } from "./_components/invoice-detail-client";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, currencyCode, settings] = await Promise.all([
    getInvoiceById(id),
    getCurrencyCode(),
    getSystemSettings(),
  ]);

  if (!invoice) notFound();

  const locale = await getLocale();

  // Serialize Dates for the client component.
  const data = JSON.parse(JSON.stringify(invoice));

  const company = {
    name:    settings["company_name"]    || "",
    logo:    settings["company_logo"]    || "",
    phone:   settings["company_phone"]   || "",
    email:   settings["company_email"]   || "",
    address: settings["company_address"] || "",
    vat:     settings["company_vat"]     || "",
  };

  return (
    <InvoiceDetailClient
      invoice={data}
      currencyCode={currencyCode}
      locale={locale}
      company={company}
    />
  );
}
