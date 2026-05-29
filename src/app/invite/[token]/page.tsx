import { getLocale, getTranslations } from "next-intl/server";
import { getInvitationByToken } from "@/actions/invitations";
import { AcceptForm } from "./_components/accept-form";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [t, locale] = await Promise.all([
    getTranslations("invite"),
    getLocale(),
  ]);

  const invitation = await getInvitationByToken(token);

  // ── Invalid token ───────────────────────────────────────────────────────────
  if (!invitation || invitation.acceptedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-3">
          <div className="text-4xl">🔗</div>
          <h1 className="text-xl font-bold">{t("invalidTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("invalidToken")}</p>
        </div>
      </div>
    );
  }

  // ── Expired ─────────────────────────────────────────────────────────────────
  if (invitation.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-3">
          <div className="text-4xl">⏰</div>
          <h1 className="text-xl font-bold">{t("expiredTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("expiredToken")}</p>
        </div>
      </div>
    );
  }

  // ── Valid — show form ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
              🏗
            </div>
          </div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <AcceptForm
            token={token}
            email={invitation.email}
            role={invitation.role}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}
