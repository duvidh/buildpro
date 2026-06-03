"use server";

import { db } from "@/lib/db";
import { requireRole, FINANCE_VIEW_ROLES } from "@/lib/auth-utils";

// ─── Project Pulse ────────────────────────────────────────────────────────────

export type ProjectPulse = {
  totalBudget: number;
  totalSpent: number;
  totalInvoiced: number;
  totalPaid: number;
  /** Physical completion % (from stored progressPercent or task-derived). */
  progressPercentage: number;
  /** totalSpent as % of totalBudget (can exceed 100). */
  budgetConsumedPercent: number;
  weeklyBurnRate: number;
  projectedStatus: "GREEN" | "AMBER" | "RED";
  weeksElapsed: number;
};

/**
 * Returns an executive financial pulse for a project.
 * Requires FINANCE_VIEW_ROLES — returns null for FIELD_WORKER.
 * All 7 DB round-trips run in parallel.
 */
export async function getProjectPulse(
  projectId: string,
): Promise<ProjectPulse | null> {
  try { await requireRole(FINANCE_VIEW_ROLES); }
  catch { return null; }

  const [project, laborAgg, expenseAgg, contractAgg, invoiceAgg, crAgg, taskGroups] =
    await Promise.all([
      db.project.findUnique({
        where: { id: projectId },
        select: { contractValue: true, startDate: true, progressPercent: true },
      }),
      db.timeEntry.aggregate({ where: { projectId }, _sum: { totalCost: true } }),
      db.expense.aggregate({ where: { projectId }, _sum: { amount: true } }),
      db.contract.aggregate({ where: { projectId }, _sum: { paidAmount: true } }),
      db.invoice.aggregate({ where: { projectId }, _sum: { total: true, paidAmount: true } }),
      db.changeRequest.aggregate({
        where: { projectId, status: "APPROVED" },
        _sum: { costImpact: true },
      }),
      db.task.groupBy({
        by: ["status"],
        where: { projectId },
        _count: { id: true },
      }),
    ]);

  if (!project) return null;

  const budgetAdditions = crAgg._sum.costImpact   ?? 0;
  const totalBudget     = (project.contractValue  ?? 0) + budgetAdditions;

  const laborCost    = laborAgg._sum.totalCost     ?? 0;
  const fieldExpCost = expenseAgg._sum.amount      ?? 0;
  const subCostPaid  = contractAgg._sum.paidAmount ?? 0;
  const totalSpent   = laborCost + fieldExpCost + subCostPaid;

  const totalInvoiced = invoiceAgg._sum.total      ?? 0;
  const totalPaid     = invoiceAgg._sum.paidAmount ?? 0;

  // Physical progress: use stored value if non-zero, else derive from task statuses
  let progressPercentage = project.progressPercent ?? 0;
  if (progressPercentage === 0 && taskGroups.length > 0) {
    const totalTasks = taskGroups.reduce((s, g) => s + g._count.id, 0);
    const doneTasks  = taskGroups.find((g) => g.status === "DONE")?._count.id ?? 0;
    if (totalTasks > 0) progressPercentage = Math.round((doneTasks / totalTasks) * 100);
  }

  // Weekly burn rate — minimum 1 week to avoid div-by-zero
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  const weeksElapsed = project.startDate
    ? Math.max(1, (Date.now() - new Date(project.startDate).getTime()) / MS_PER_WEEK)
    : 1;
  const weeklyBurnRate = totalSpent / weeksElapsed;

  // Budget consumed % — capped at 999 for display safety
  const budgetConsumedPercent = totalBudget > 0
    ? Math.min(Math.round((totalSpent / totalBudget) * 100), 999)
    : 0;

  // Projected overrun: if burn rate projects spending > budget before 100% physical
  let projectedStatus: "GREEN" | "AMBER" | "RED" = "GREEN";
  if (totalBudget > 0 && totalSpent > 0) {
    if (progressPercentage > 0) {
      const projectedTotal = totalSpent / (progressPercentage / 100);
      if      (projectedTotal > totalBudget * 1.10) projectedStatus = "RED";
      else if (projectedTotal > totalBudget)         projectedStatus = "AMBER";
    } else if (totalSpent > totalBudget) {
      projectedStatus = "RED";
    }
  }

  return {
    totalBudget,
    totalSpent,
    totalInvoiced,
    totalPaid,
    progressPercentage,
    budgetConsumedPercent,
    weeklyBurnRate,
    projectedStatus,
    weeksElapsed: Math.round(weeksElapsed),
  };
}

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
