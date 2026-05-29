"use server";

import { db } from "@/lib/db";
import { requireRole, FINANCE_VIEW_ROLES } from "@/lib/auth-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectFinancialSummary = {
  /** Sum of TimeEntry.totalCost for this project */
  laborCost: number;
  /** Sum of Expense.amount for this project */
  fieldExpCost: number;
  /** Sum of Contract.value for this project (total sub-contract commitments) */
  subContractValue: number;
  /** Sum of Contract.paidAmount for this project (cash already out to subs) */
  subCostPaid: number;
  /** Sum of Invoice.total for this project (total billed to client) */
  invoicedTotal: number;
  /** Sum of Invoice.paidAmount for this project (cash actually received) */
  invoicePaidTotal: number;
  /** Sum of approved ChangeRequest.costImpact (budget additions) */
  budgetAdditions: number;
};

// ─── Aggregation query ────────────────────────────────────────────────────────

/**
 * Returns pre-aggregated financial KPIs for a project.
 * All five DB round-trips run in parallel via Promise.all.
 * No raw row arrays are returned — all arithmetic happens in PostgreSQL.
 */
export async function getProjectFinancialSummary(
  projectId: string
): Promise<ProjectFinancialSummary | null> {
  try { await requireRole(FINANCE_VIEW_ROLES); }
  catch { return null; }

  const [laborAgg, expenseAgg, contractAgg, invoiceAgg, crAgg] =
    await Promise.all([
      db.timeEntry.aggregate({
        where: { projectId },
        _sum: { totalCost: true },
      }),
      db.expense.aggregate({
        where: { projectId },
        _sum: { amount: true },
      }),
      db.contract.aggregate({
        where: { projectId },
        _sum: { value: true, paidAmount: true },
      }),
      db.invoice.aggregate({
        where: { projectId },
        _sum: { total: true, paidAmount: true },
      }),
      // Only approved change requests count toward the budget
      db.changeRequest.aggregate({
        where: { projectId, status: "APPROVED" },
        _sum: { costImpact: true },
      }),
    ]);

  return {
    laborCost:        laborAgg._sum.totalCost   ?? 0,
    fieldExpCost:     expenseAgg._sum.amount     ?? 0,
    subContractValue: contractAgg._sum.value      ?? 0,
    subCostPaid:      contractAgg._sum.paidAmount ?? 0,
    invoicedTotal:    invoiceAgg._sum.total       ?? 0,
    invoicePaidTotal: invoiceAgg._sum.paidAmount  ?? 0,
    budgetAdditions:  crAgg._sum.costImpact       ?? 0,
  };
}
