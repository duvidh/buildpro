/** Converts an Israeli phone string to E.164 digits for wa.me links. */
export function formatPhoneForWhatsApp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("972")) return digits;                    // already E.164
  if (digits.startsWith("0") && digits.length >= 9) return "972" + digits.slice(1);
  if (digits.length >= 9) return "972" + digits;
  return digits;
}

export type WhatsAppMessageParams = {
  clientName: string;
  projectName: string;
  progress: number;
  lastCompletedMilestone: string | null;
  nextPendingMilestone: string | null;
};

export function generateWhatsAppMessage(params: WhatsAppMessageParams): string {
  const { clientName, projectName, progress, lastCompletedMilestone, nextPendingMilestone } = params;
  const lines: string[] = [
    `שלום ${clientName},`,
    `עדכון סטטוס לפרויקט ${projectName}:`,
  ];
  if (lastCompletedMilestone) {
    lines.push(`✅ השלמנו את: ${lastCompletedMilestone}`);
  }
  lines.push(`🏗️ התקדמות כללית: ${progress}%`);
  if (nextPendingMilestone) {
    lines.push(`⏳ השלב הבא: ${nextPendingMilestone}`);
  }
  lines.push("", "לשאלות, אנחנו כאן!");
  return lines.join("\n");
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const e164 = formatPhoneForWhatsApp(phone);
  return `https://wa.me/${e164 ?? ""}?text=${encodeURIComponent(message)}`;
}
