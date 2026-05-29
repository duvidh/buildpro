import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: t("pageTitle") };
}

export default function LoginPage() {
  return <LoginForm />;
}
