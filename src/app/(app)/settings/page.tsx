export const dynamic = "force-dynamic";

import { Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { getSystemSettings } from "@/actions/settings";
import { getUsers, seedUsers } from "@/actions/users";
import { getInvitations } from "@/actions/invitations";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export default async function SettingsPage() {
  const [t, session] = await Promise.all([
    getTranslations("settings"),
    getSession(),
  ]);

  const isAdmin   = session?.role === "ADMIN";
  const canInvite = isAdmin;

  if (process.env.NODE_ENV !== "production") await seedUsers();

  const [systemSettings, users, invitations] = await Promise.all([
    getSystemSettings(),
    getUsers(),
    isAdmin ? getInvitations() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 shrink-0">
          <Settings className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      <SettingsTabs
        systemSettings={systemSettings}
        users={users}
        invitations={JSON.parse(JSON.stringify(invitations))}
        canInvite={canInvite}
      />
    </div>
  );
}
