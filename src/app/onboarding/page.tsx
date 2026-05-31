import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { OnboardingForm } from "./onboarding-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return { title: t("pageTitle") };
}

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // If the user already belongs to a company, skip onboarding.
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { companyId: true },
  });
  if (user?.companyId) redirect("/dashboard");

  return <OnboardingForm />;
}
