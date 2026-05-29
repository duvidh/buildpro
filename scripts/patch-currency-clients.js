/**
 * Patches client components that use fmtShekel:
 * 1. Removes `import { fmtShekel } from "@/lib/utils"` (or keeps utils import if other things imported)
 * 2. Adds `import { useCurrency } from "@/lib/currency-context"`
 * 3. Adds `const { fmtCompact, fmtAmount } = useCurrency();` after the first hook line
 *    (specifically after `const t = useTranslations` or `const locale = useLocale()` etc.)
 *
 * Run: node scripts/patch-currency-clients.js
 */

const fs   = require("fs");
const path = require("path");

const BASE = "C:/Users/User.DESKTOP-R26AVG6/Documents/buildpro/src";

// Files to patch + whether they need fmtAmount (detail) or just fmtCompact (summary)
const FILES = [
  // Dashboard widgets
  { rel: "components/dashboard/widgets/KpiWidget.tsx",         needs: ["fmtCompact"] },
  { rel: "components/dashboard/widgets/FinanceWidget.tsx",     needs: ["fmtCompact"] },
  { rel: "components/dashboard/widgets/InvoicesDueWidget.tsx", needs: ["fmtCompact"] },
  { rel: "components/dashboard/widgets/PaymentsWidget.tsx",    needs: ["fmtCompact"] },
  { rel: "components/dashboard/widgets/ProjectsWidget.tsx",    needs: ["fmtCompact"] },
  // Leads
  { rel: "components/leads/leads-table.tsx",    needs: ["fmtCompact"] },
  { rel: "components/leads/leads-pipeline.tsx", needs: ["fmtCompact"] },
  // Clients
  { rel: "components/clients/clients-table.tsx", needs: ["fmtCompact"] },
  // Equipment
  { rel: "components/equipment/equipment-manager.tsx", needs: ["fmtCompact"] },
  // Project tabs
  { rel: "components/projects/cr-tab.tsx",          needs: ["fmtCompact"] },
  { rel: "components/projects/procurement-tab.tsx", needs: ["fmtCompact"] },
  { rel: "components/projects/wbs-tab.tsx",         needs: ["fmtCompact"] },
  // Finance
  { rel: "components/finance/ledger-client.tsx", needs: ["fmtAmount"] },
  // Quotes
  { rel: "components/quotes/quotes-content.tsx", needs: ["fmtCompact"] },
  // Project financials (uses both)
  { rel: "app/(app)/projects/[id]/_components/financials-client.tsx", needs: ["fmtAmount", "fmtCompact"] },
  // Project header
  { rel: "app/(app)/projects/[id]/_components/project-header.tsx", needs: ["fmtCompact"] },
  // Invoices
  { rel: "app/(app)/clients/[id]/invoices/_components/create-invoice-dialog.tsx", needs: ["fmtAmount"] },
];

for (const { rel, needs } of FILES) {
  const fullPath = path.join(BASE, rel);
  if (!fs.existsSync(fullPath)) {
    console.warn(`SKIP (not found): ${rel}`);
    continue;
  }

  let src = fs.readFileSync(fullPath, "utf8");
  let changed = false;

  // 1. Remove fmtShekel from utils import (handle various import forms)
  const utilsImportRe = /import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/utils["'];?\n?/;
  const utilsMatch = src.match(utilsImportRe);
  if (utilsMatch) {
    const imports = utilsMatch[1]
      .split(",")
      .map(s => s.trim())
      .filter(s => s && s !== "fmtShekel");
    if (imports.length === 0) {
      // Remove the entire line
      src = src.replace(utilsImportRe, "");
    } else {
      // Keep remaining imports
      src = src.replace(utilsImportRe, `import { ${imports.join(", ")} } from "@/lib/utils";\n`);
    }
    changed = true;
  }

  // 2. Add useCurrency import if not already present
  if (!src.includes("useCurrency")) {
    // Insert after the last import block
    src = src.replace(
      /^("use client";\n\n)/,
      `$1import { useCurrency } from "@/lib/currency-context";\n`
    );
    changed = true;
  }

  // 3. Replace fmtShekel( calls
  //    - Most uses: fmtShekel(x) → fmtCompact(x)  (compact format for widgets, tabs)
  //    - Detail uses: if file has "fmtAmount" in needs, lines with "invoice.total", "balance", etc. → fmtAmount
  //    Simple heuristic: replace all with the primary format for this file
  const primary = needs.includes("fmtAmount") && !needs.includes("fmtCompact") ? "fmtAmount" : "fmtCompact";

  if (src.includes("fmtShekel(")) {
    src = src.replace(/fmtShekel\(/g, `${primary}(`);
    changed = true;
  }

  // 4. For files that need both, we'll do a second pass post-script if needed
  //    (financials-client needs manual review)

  fs.writeFileSync(fullPath, src, "utf8");
  console.log(`PATCHED: ${rel}`);
}

console.log("\nDone. Verify and add useCurrency() hook call manually if needed.");
