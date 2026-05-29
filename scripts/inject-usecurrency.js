/**
 * Injects `const { fmtXxx } = useCurrency();` into the first exported function
 * in each file, right after the function's opening brace line.
 */

const fs   = require("fs");
const path = require("path");

const BASE = "C:/Users/User.DESKTOP-R26AVG6/Documents/buildpro/src";

const FILES = [
  // fmtCompact only
  { rel: "components/dashboard/widgets/KpiWidget.tsx",         hook: "const { fmtCompact } = useCurrency();" },
  { rel: "components/dashboard/widgets/FinanceWidget.tsx",     hook: "const { fmtCompact } = useCurrency();" },
  { rel: "components/dashboard/widgets/InvoicesDueWidget.tsx", hook: "const { fmtCompact } = useCurrency();" },
  { rel: "components/dashboard/widgets/PaymentsWidget.tsx",    hook: "const { fmtCompact } = useCurrency();" },
  { rel: "components/dashboard/widgets/ProjectsWidget.tsx",    hook: "const { fmtCompact } = useCurrency();" },
  { rel: "components/leads/leads-table.tsx",                   hook: "const { fmtCompact } = useCurrency();" },
  { rel: "components/leads/leads-pipeline.tsx",                hook: "const { fmtCompact } = useCurrency();" },
  { rel: "components/clients/clients-table.tsx",               hook: "const { fmtCompact } = useCurrency();" },
  { rel: "components/equipment/equipment-manager.tsx",         hook: "const { fmtCompact } = useCurrency();" },
  { rel: "components/projects/cr-tab.tsx",                     hook: "const { fmtCompact } = useCurrency();" },
  { rel: "components/projects/procurement-tab.tsx",            hook: "const { fmtCompact } = useCurrency();" },
  { rel: "components/projects/wbs-tab.tsx",                    hook: "const { fmtCompact } = useCurrency();" },
  { rel: "components/quotes/quotes-content.tsx",               hook: "const { fmtCompact } = useCurrency();" },
  { rel: "app/(app)/projects/[id]/_components/project-header.tsx", hook: "const { fmtCompact } = useCurrency();" },
  // fmtAmount only
  { rel: "components/finance/ledger-client.tsx",                                           hook: "const { fmtAmount } = useCurrency();" },
  { rel: "app/(app)/clients/[id]/invoices/_components/create-invoice-dialog.tsx",          hook: "const { fmtAmount } = useCurrency();" },
  // both
  { rel: "app/(app)/projects/[id]/_components/financials-client.tsx",
    hook: "const { fmtCompact, fmtAmount } = useCurrency();" },
];

for (const { rel, hook } of FILES) {
  const fullPath = path.join(BASE, rel);
  if (!fs.existsSync(fullPath)) { console.warn(`SKIP: ${rel}`); continue; }

  let src = fs.readFileSync(fullPath, "utf8");
  const lines = src.split("\n");

  // Find the exported function/component — look for `export function` or `export default function`
  // then find its opening brace (the line that ends with `{`)
  let insertAfterLine = -1;
  let insideFunctionBrace = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match exported function declaration
    if (/export\s+(default\s+)?function\s+\w+/.test(line) || /export\s+function\s+\w+/.test(line)) {
      // Find the opening brace - it might be on this line or the next
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].trim().endsWith("{")) {
          insertAfterLine = j;
          break;
        }
      }
      if (insertAfterLine !== -1) break;
    }
  }

  if (insertAfterLine === -1) {
    // Fallback: find first `export const \w+ = ` arrow function
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/export\s+(const|default)\s+\w+/.test(line)) {
        // Find { within next few lines
        for (let j = i; j < Math.min(i + 8, lines.length); j++) {
          if (lines[j].trim().endsWith("{")) {
            insertAfterLine = j;
            break;
          }
        }
        if (insertAfterLine !== -1) break;
      }
    }
  }

  if (insertAfterLine === -1) {
    console.warn(`  COULD NOT FIND insertion point in: ${rel}`);
    continue;
  }

  // Determine indentation from the next line
  const nextLine = lines[insertAfterLine + 1] ?? "  ";
  const indentMatch = nextLine.match(/^(\s+)/);
  const indent = indentMatch ? indentMatch[1] : "  ";

  // Insert the hook line
  lines.splice(insertAfterLine + 1, 0, `${indent}${hook}`);

  fs.writeFileSync(fullPath, lines.join("\n"), "utf8");
  console.log(`INJECTED into ${rel} after line ${insertAfterLine + 1}`);
}

console.log("\nAll done.");
