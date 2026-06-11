export const dynamic = "force-dynamic";

import { Fragment } from "react";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getQuoteById } from "@/actions/quotes";
import { getSystemSettings, getCurrencyCode } from "@/actions/settings";
import { db } from "@/lib/db";
import { currentCompanyId } from "@/lib/tenant";
import { PrintButton } from "./_components/print-button";

type QuoteItemRow = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  linePrice: number;
  categoryId: string | null;
  order: number;
};

export default async function QuotePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [quote, settings, currencyCode, locale, t] = await Promise.all([
    getQuoteById(id), // QUOTE_ROLES + tenancy enforced inside
    getSystemSettings(),
    getCurrencyCode(),
    getLocale(),
    getTranslations("quotes.print"),
  ]);
  if (!quote) notFound();

  // Full client card (the quote include only carries id + name).
  const cid = await currentCompanyId();
  const client = quote.client
    ? await db.client.findFirst({
        where: { id: quote.client.id, companyId: cid },
        select: {
          name: true, contactName: true, address: true,
          phone: true, email: true, companyNumber: true,
        },
      })
    : null;

  const company = {
    name:    settings["company_name"]    || "",
    logo:    settings["company_logo"]    || "",
    phone:   settings["company_phone"]   || "",
    email:   settings["company_email"]   || "",
    address: settings["company_address"] || "",
    vat:     settings["company_vat"]     || "",
  };

  const isRTL = locale !== "en";
  const intlLocale = isRTL ? "he-IL" : "en-US";
  const fmt = (n: number) =>
    new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: currencyCode || "ILS",
      maximumFractionDigits: 0,
    }).format(n);
  const fmtDate = (d: Date | string | null) =>
    d
      ? new Intl.DateTimeFormat(intlLocale, {
          day: "2-digit", month: "2-digit", year: "numeric",
        }).format(new Date(d))
      : "";

  // Group line items under their chapters; uncategorized rows come first.
  const items = quote.items as QuoteItemRow[];
  const categories = (quote.categories ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }));
  const groups: { name: string | null; items: QuoteItemRow[] }[] = [
    { name: null, items: items.filter((i) => !i.categoryId) },
    ...categories.map((c) => ({
      name: c.name,
      items: items.filter((i) => i.categoryId === c.id),
    })),
  ].filter((g) => g.items.length > 0);

  const contingencyAmt =
    Math.round(quote.subtotal * ((quote.contingencyPercent ?? 0) / 100) * 100) / 100;
  const billToName = client?.name ?? quote.lead?.name ?? "";
  let rowNo = 0;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="px-2 py-4 sm:px-4 print:p-0">
      <PrintButton quoteId={quote.id} printLabel={t("printBtn")} backLabel={t("back")} />

      {/* ── A4 sheet ── */}
      <div
        className="mx-auto flex max-w-[210mm] min-h-[297mm] flex-col bg-white p-8 text-black shadow-xl
          sm:p-10 print:min-h-0 print:max-w-none print:p-0 print:shadow-none"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        {/* Header: company | document title */}
        <div className="mb-8 flex items-start justify-between gap-6 border-b-2 border-gray-800 pb-6">
          <div className="flex items-center gap-4">
            {company.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo} alt={company.name} className="h-16 w-16 object-contain" />
            )}
            <div>
              {company.name && <p className="text-2xl font-bold">{company.name}</p>}
              <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                {company.address && <p>{company.address}</p>}
                {(company.phone || company.email) && (
                  <p>
                    {company.phone && <span dir="ltr">{company.phone}</span>}
                    {company.phone && company.email && <span className="mx-1.5">·</span>}
                    {company.email && <span dir="ltr">{company.email}</span>}
                  </p>
                )}
                {company.vat && <p>{t("vatNumber")}: {company.vat}</p>}
              </div>
            </div>
          </div>
          <div className="text-end">
            <h1 className="text-3xl font-bold tracking-tight">{t("docTitle")}</h1>
            {quote.quoteNumber && (
              <p className="mt-1 text-sm font-medium text-gray-700" dir="ltr">
                {quote.quoteNumber}
              </p>
            )}
            <div className="mt-2 space-y-0.5 text-xs text-gray-600">
              <p>{t("date")}: <span dir="ltr">{fmtDate(quote.date)}</span></p>
              {quote.validUntil && (
                <p>{t("validUntil")}: <span dir="ltr">{fmtDate(quote.validUntil)}</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Bill to */}
        <div className="mb-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t("billTo")}
          </p>
          <p className="text-base font-bold">{billToName}</p>
          <div className="mt-0.5 space-y-0.5 text-xs text-gray-600">
            {client?.contactName && client.contactName !== client.name && <p>{client.contactName}</p>}
            {client?.address && <p>{client.address}</p>}
            {(client?.phone || client?.email) && (
              <p>
                {client?.phone && <span dir="ltr">{client.phone}</span>}
                {client?.phone && client?.email && <span className="mx-1.5">·</span>}
                {client?.email && <span dir="ltr">{client.email}</span>}
              </p>
            )}
            {client?.companyNumber && <p>{t("vatNumber")}: {client.companyNumber}</p>}
          </div>
        </div>

        {/* Quote title from the AI draft / header notes */}
        {quote.notes && (
          <p className="mb-4 text-sm font-semibold text-gray-800">{quote.notes}</p>
        )}

        {/* Line items */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-800 text-xs text-gray-700">
              <th className="w-8 py-2 text-start font-semibold">#</th>
              <th className="py-2 text-start font-semibold">{t("item")}</th>
              <th className="w-14 py-2 text-center font-semibold">{t("unit")}</th>
              <th className="w-16 py-2 text-center font-semibold">{t("qty")}</th>
              <th className="w-24 py-2 text-end font-semibold">{t("unitPrice")}</th>
              <th className="w-28 py-2 text-end font-semibold">{t("lineTotal")}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.name ?? "__general"}>
                {group.name && (
                  <tr className="border-b border-gray-300 bg-gray-50">
                    <td colSpan={6} className="py-1.5 text-xs font-bold text-gray-700">
                      {group.name}
                    </td>
                  </tr>
                )}
                {group.items.map((item) => {
                  rowNo += 1;
                  return (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-2 text-xs text-gray-500">{rowNo}</td>
                      <td className="py-2">{item.name}</td>
                      <td className="py-2 text-center text-xs text-gray-600">{item.unit}</td>
                      <td className="py-2 text-center tabular-nums">{item.quantity}</td>
                      <td className="py-2 text-end tabular-nums">{fmt(item.unitPrice)}</td>
                      <td className="py-2 text-end font-medium tabular-nums">{fmt(item.linePrice)}</td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-72 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>{t("subtotal")}</span>
              <span className="tabular-nums">{fmt(quote.subtotal)}</span>
            </div>
            {contingencyAmt > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>{t("contingency", { pct: quote.contingencyPercent })}</span>
                <span className="tabular-nums">{fmt(contingencyAmt)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>{t("vat", { pct: quote.taxPercent })}</span>
              <span className="tabular-nums">{fmt(quote.taxAmount)}</span>
            </div>
            <div className="mt-1.5 flex justify-between border-t-2 border-gray-800 pt-2 text-base font-bold">
              <span>{t("grandTotal")}</span>
              <span className="tabular-nums">{fmt(quote.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer: terms + signatures — pushed to the sheet bottom */}
        <div className="mt-auto pt-10">
          <p className="mb-8 text-xs text-gray-500">
            {quote.validUntil
              ? t("validityUntil", { date: fmtDate(quote.validUntil) })
              : t("validity30")}
          </p>
          <div className="flex items-end justify-between gap-12 text-xs text-gray-600">
            <div className="flex-1">
              <div className="border-t border-gray-400 pt-1.5">{t("companySignature")}</div>
            </div>
            <div className="flex-1">
              <div className="border-t border-gray-400 pt-1.5">{t("clientSignature")}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
