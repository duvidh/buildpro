"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { getSession, createSession } from "@/lib/session";
import { UserRole } from "@/generated/prisma/client";
import { seedDemoProject } from "@/lib/demo-seed";

export async function createCompany(
  name: string,
  // Kept for call-site compatibility; demo seeding moved to loadSampleData().
  _locale: "en" | "he" = "he"
): Promise<{ error: string } | void> {
  const session = await getSession();
  if (!session) return { error: "unauthorized" };
  const trimmed = name.trim();
  if (!trimmed) return { error: "name_required" };

  let companyId: string;
  try {
    const company = await db.company.create({ data: { name: trimmed } });
    companyId = company.id;
    await db.user.update({
      where: { id: session.userId },
      data: { companyId, role: UserRole.ADMIN },
    });
    // Re-issue the session so companyId + ADMIN role take effect immediately.
    await createSession({
      userId: session.userId,
      role: UserRole.ADMIN,
      name: session.name,
      email: session.email,
      companyId,
    });
  } catch (e) {
    console.error(
      "[createCompany] failed:",
      e instanceof Error ? e.message : e
    );
    return { error: "generic" };
  }

  // New companies start empty: the dashboard shows the setup checklist
  // (progressive disclosure), and demo data is opt-in via loadSampleData().
  redirect("/dashboard"); // outside try/catch — redirect throws internally
}

// ─── Setup checklist (progressive disclosure for new companies) ──────────────

const CHECKLIST_DISMISS_KEY = "onboarding_checklist_dismissed";

export type SetupProgress = {
  hasClient: boolean;
  hasProject: boolean;
  hasQuote: boolean;
  hasTeamMember: boolean;
  hasDailyLog: boolean;
  completedCount: number;
  totalSteps: number;
  showChecklist: boolean;
};

/**
 * Returns the company's onboarding progress, or null when there is no
 * company context (or on DB failure) — callers fall back to the regular
 * dashboard in that case.
 */
export async function getSetupProgress(): Promise<SetupProgress | null> {
  const session = await getSession();
  const cid = session?.companyId;
  if (!cid) return null;

  try {
    const [client, project, quote, teamMember, dailyLog, dismissed] =
      await Promise.all([
        db.client.findFirst({ where: { companyId: cid }, select: { id: true } }),
        db.project.findFirst({ where: { companyId: cid }, select: { id: true } }),
        db.quote.findFirst({ where: { companyId: cid }, select: { id: true } }),
        // Anyone besides the user who created the company counts as "team".
        db.user.findFirst({
          where: { companyId: cid, id: { not: session.userId } },
          select: { id: true },
        }),
        db.dailyLog.findFirst({ where: { companyId: cid }, select: { id: true } }),
        db.systemSetting.findUnique({
          where: { companyId_key: { companyId: cid, key: CHECKLIST_DISMISS_KEY } },
          select: { value: true },
        }),
      ]);

    const flags = {
      hasClient: !!client,
      hasProject: !!project,
      hasQuote: !!quote,
      hasTeamMember: !!teamMember,
      hasDailyLog: !!dailyLog,
    };
    const completedCount = Object.values(flags).filter(Boolean).length;
    const totalSteps = Object.keys(flags).length;

    return {
      ...flags,
      completedCount,
      totalSteps,
      showChecklist: completedCount < totalSteps && dismissed?.value !== "true",
    };
  } catch (e) {
    console.error("[getSetupProgress] failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Hide the setup checklist for this company and show the full dashboard. */
export async function dismissSetupChecklist() {
  const session = await getSession();
  const cid = session?.companyId;
  if (!cid) return { success: false as const, error: "unauthorized" as const };

  try {
    await db.systemSetting.upsert({
      where: { companyId_key: { companyId: cid, key: CHECKLIST_DISMISS_KEY } },
      update: { value: "true" },
      create: {
        companyId: cid,
        key: CHECKLIST_DISMISS_KEY,
        value: "true",
        description: "Setup checklist dismissed",
      },
    });
  } catch (e) {
    console.error("[dismissSetupChecklist] failed:", e instanceof Error ? e.message : e);
    return { success: false as const, error: "generic" as const };
  }

  revalidatePath("/dashboard");
  return { success: true as const };
}

/**
 * Seed the bilingual demo project for users who prefer to explore a working
 * dashboard. Also dismisses the checklist so they land on the full grid
 * (the seed intentionally leaves some steps, e.g. quotes, incomplete).
 */
export async function loadSampleData() {
  const [session, locale] = await Promise.all([
    getSession(),
    getLocale().catch(() => "he" as const),
  ]);
  if (!session?.companyId || !session?.userId) {
    return { success: false as const, error: "unauthorized" as const };
  }

  try {
    await seedDemoProject(
      session.companyId,
      session.userId,
      (locale === "en" ? "en" : "he") as "en" | "he",
    );
  } catch (e) {
    console.error("[loadSampleData] failed:", e instanceof Error ? e.message : e);
    return { success: false as const, error: "seed_failed" as const };
  }

  await dismissSetupChecklist();
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { success: true as const };
}
