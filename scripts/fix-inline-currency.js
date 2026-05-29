/**
 * Fixes remaining hardcoded ₪ patterns that the previous scripts didn't cover.
 * Grouped by category:
 *   A) Display values with toLocaleString
 *   B) "₪0" literals
 *   C) Form labels "(₪)" → remove ₪
 *   D) field-client.tsx inline expressions
 */

const fs   = require("fs");
const path = require("path");

const BASE = "C:/Users/User.DESKTOP-R26AVG6/Documents/buildpro/src";

function patch(relPath, fn) {
  const full = path.join(BASE, relPath);
  if (!fs.existsSync(full)) { console.warn(`SKIP: ${relPath}`); return; }
  const before = fs.readFileSync(full, "utf8");
  const after  = fn(before);
  if (before !== after) {
    fs.writeFileSync(full, after, "utf8");
    console.log(`PATCHED: ${relPath}`);
  } else {
    console.log(`NO CHANGE: ${relPath}`);
  }
}

// ─── A) leads-pipeline.tsx ────────────────────────────────────────────────────
patch("components/leads/leads-pipeline.tsx", (src) =>
  src.replace(
    /₪\{lead\.budget\.toLocaleString\("he-IL"\)\}/g,
    "{fmtCompact(lead.budget)}"
  )
);

// ─── A) leads-table.tsx ───────────────────────────────────────────────────────
patch("components/leads/leads-table.tsx", (src) =>
  src.replace(
    /`₪\$\{lead\.budget\.toLocaleString\("he-IL"\)\}`/g,
    "fmtCompact(lead.budget)"
  )
);

// ─── A) clients-table.tsx ─────────────────────────────────────────────────────
patch("components/clients/clients-table.tsx", (src) => {
  let s = src;
  // `₪${client.totalContract.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}`
  s = s.replace(
    /`₪\$\{client\.totalContract\.toLocaleString\(dateLocale,\s*\{[^}]*\}\)\}`/g,
    "fmtCompact(client.totalContract)"
  );
  // ₪{client.balance.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}
  s = s.replace(
    /₪\{client\.balance\.toLocaleString\(dateLocale,\s*\{[^}]*\}\)\}/g,
    "{fmtCompact(client.balance)}"
  );
  return s;
});

// ─── A) PaymentsWidget.tsx ───────────────────────────────────────────────────
patch("components/dashboard/widgets/PaymentsWidget.tsx", (src) =>
  src.replace(
    /₪\{payment\.amount\.toLocaleString\("he-IL",\s*\{[^}]*\}\)\}/g,
    "{fmtCompact(payment.amount)}"
  )
);

// ─── A) quotes-content.tsx ───────────────────────────────────────────────────
patch("components/quotes/quotes-content.tsx", (src) =>
  src.replace(
    /`₪\$\{q\.total\.toLocaleString\(dateLocale,\s*\{[^}]*\}\)\}`/g,
    "fmtCompact(q.total)"
  )
);

// ─── A) project-header.tsx ───────────────────────────────────────────────────
patch("app/(app)/projects/[id]/_components/project-header.tsx", (src) =>
  src.replace(
    /₪\{project\.contractValue\.toLocaleString\(dateLocale,\s*\{[^}]*\}\)\}/g,
    "{fmtCompact(project.contractValue)}"
  )
);

// ─── A) project-inline-workspace.tsx ─────────────────────────────────────────
patch("app/(app)/clients/[id]/projects/_components/project-inline-workspace.tsx", (src) => {
  let s = src;
  s = s.replace(
    /₪\{project\.contractValue\.toLocaleString\("he-IL",\s*\{[^}]*\}\)\}/g,
    "{fmtCompact(project.contractValue)}"
  );
  // Also add useCurrency import if not there
  if (!s.includes("useCurrency") && s.includes("fmtCompact")) {
    s = s.replace(
      /^("use client";\n\n)/,
      `$1import { useCurrency } from "@/lib/currency-context";\n`
    );
  }
  return s;
});

// ─── B) "₪0" literals ────────────────────────────────────────────────────────
patch("app/(app)/projects/[id]/_components/financials-client.tsx", (src) =>
  src.replace(/"₪0"/g, `fmtCompact(0)`)
);

patch("components/projects/wbs-tab.tsx", (src) =>
  src.replace(/"₪0"/g, `fmtCompact(0)`)
);

// ─── C) Form labels — remove (₪) from label text ─────────────────────────────
// Pattern: (₪) or (₪) *  →  remove just the ₪ part to keep the parens structure
const labelFiles = [
  "components/projects/cr-tab.tsx",
  "components/projects/procurement-tab.tsx",
  "components/projects/wbs-tab.tsx",
  "app/(app)/projects/[id]/_components/financials-client.tsx",
  "app/(app)/clients/[id]/invoices/_components/create-invoice-dialog.tsx",
];

for (const f of labelFiles) {
  patch(f, (src) =>
    // "(₪)" → "()" and then "()" → remove empty parens or keep as is
    // Simpler: replace " (₪)" with "" and "(₪) " with "" and "(₪)" with ""
    src
      .replace(/ \(₪\) \*/g, " *")
      .replace(/ \(₪\)\*/g, "*")
      .replace(/\(₪\) \*/g, "*")
      .replace(/ \(₪\)/g, "")
      .replace(/\(₪\)/g, "")
  );
}

// ─── D) field-client.tsx inline patterns ─────────────────────────────────────
patch("app/(app)/projects/[id]/_components/field-client.tsx", (src) => {
  let s = src;
  // Add useCurrency import
  if (!s.includes("useCurrency")) {
    s = s.replace(
      /^("use client";\n\n)/,
      `$1import { useCurrency } from "@/lib/currency-context";\n`
    );
  }
  // "תעריף לשעה (₪) *" → "תעריף לשעה *"
  s = s
    .replace(/ \(₪\) \*/g, " *")
    .replace(/ \(₪\)\*/g, "*")
    .replace(/ \(₪\)/g, "")
    .replace(/\(₪\)/g, "");
  // ₪{(parseFloat(hours) * parseFloat(rate)).toLocaleString("he-IL", { maximumFractionDigits: 0 })}
  s = s.replace(
    /₪\{\(parseFloat\(hours\) \* parseFloat\(rate\)\)\.toLocaleString\("he-IL",\s*\{[^}]*\}\)\}/g,
    "{fmtCompact(parseFloat(hours) * parseFloat(rate))}"
  );
  // ₪{totalCost.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
  s = s.replace(
    /₪\{totalCost\.toLocaleString\("he-IL",\s*\{[^}]*\}\)\}/g,
    "{fmtCompact(totalCost)}"
  );
  // ₪{e.totalCost.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
  s = s.replace(
    /₪\{e\.totalCost\.toLocaleString\("he-IL",\s*\{[^}]*\}\)\}/g,
    "{fmtCompact(e.totalCost)}"
  );
  // סה״כ ₪{totalExpenses.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
  s = s.replace(
    /₪\{totalExpenses\.toLocaleString\("he-IL",\s*\{[^}]*\}\)\}/g,
    "{fmtCompact(totalExpenses)}"
  );
  // ₪{e.amount.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
  s = s.replace(
    /₪\{e\.amount\.toLocaleString\("he-IL",\s*\{[^}]*\}\)\}/g,
    "{fmtCompact(e.amount)}"
  );
  return s;
});

console.log("\nDone.");
