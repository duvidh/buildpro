import { Resend } from "resend";

// Lazily initialised — never constructed at module load time so the build
// phase (which runs without env vars) doesn't throw "Missing API key".
let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "BuildPro <noreply@buildpro.app>";

const ROLE_LABELS: Record<string, { en: string; he: string }> = {
  ADMIN:           { en: "System Admin",      he: "מנהל מערכת"       },
  OFFICE_MANAGER:  { en: "Office Manager",    he: "מנהל/ת משרד"      },
  PROJECT_MANAGER: { en: "Project Manager",   he: "מנהל פרויקטים"    },
  FIELD_WORKER:    { en: "Field Worker",      he: "איש שטח"          },
};

export async function sendInvitationEmail({
  to,
  inviterName,
  role,
  token,
}: {
  to: string;
  inviterName: string;
  role: string;
  token: string;
}) {
  // Derive the public app URL — Vercel sets VERCEL_PROJECT_PRODUCTION_URL in prod
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");

  const acceptUrl = `${appUrl}/invite/${token}`;
  const roleEn = ROLE_LABELS[role]?.en ?? role;

  const html = `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1e1f3b;padding:28px 40px;">
            <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">🏗 BuildPro</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 24px;">
            <h1 style="margin:0 0 8px;font-size:22px;color:#111827;">You've been invited!</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
              <strong style="color:#111827;">${inviterName}</strong> has invited you to join <strong style="color:#111827;">BuildPro</strong> as a <strong style="color:#4f46e5;">${roleEn}</strong>.
            </p>
            <a href="${acceptUrl}"
               style="display:inline-block;padding:13px 28px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
              Accept Invitation →
            </a>
            <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
              This link expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 40px 28px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#d1d5db;">
              Or copy this URL into your browser:<br/>
              <span style="color:#6b7280;word-break:break-all;">${acceptUrl}</span>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `You've been invited to BuildPro as ${roleEn}`,
    html,
  });
}
