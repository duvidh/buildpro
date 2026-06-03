"use server";

export type AIContext = "project" | "client" | "generic";

// Simulates a ~600–900 ms AI round-trip.
function delay() {
  return new Promise<void>((r) => setTimeout(r, 600 + Math.random() * 300));
}

export async function askProjectAI(
  prompt: string,
  _entityId: string,
  context: AIContext,
  locale: "he" | "en",
): Promise<string> {
  await delay();

  const p = prompt.toLowerCase();

  // ── Hebrew ────────────────────────────────────────────────────────────────────
  if (locale === "he") {
    // WhatsApp draft
    if (p.includes("whatsapp")) {
      return "הנה טיוטה להודעה: 'שלום, מעדכן שהשלמנו השבוע את יציקת היסודות בפרויקט בהצלחה. לשאלות אני זמין!'";
    }
    // Budget / progress
    if (p.includes("תקציב") || p.includes("חריגות") || p.includes("חריגה") || p.includes("התקדמות")) {
      return 'לפי הנתונים, פרויקט זה נמצא ב-80% ניצול תקציב. קיימת חריגה של 5,000 ש"ח בסעיף אינסטלציה, אך שאר הסעיפים תקינים.';
    }
    // Risks
    if (p.includes("סיכונים") || p.includes("סיכון")) {
      return "אין סיכונים חריגים. מזג האוויר השבוע מתאים לעבודות חוץ.";
    }
    // Client: debts / invoices
    if (context === "client" && (p.includes("חובות") || p.includes("חשבוניות") || p.includes("יתרה"))) {
      return 'ללקוח זה יש חשבונית אחת פתוחה על סך 15,000 ש"ח (חשבון עסקה — גמר שלד) שטרם שולמה.';
    }
    // Client: history
    if (context === "client" && p.includes("היסטוריה")) {
      return "לקוח פעיל עם 3 פרויקטים בסך הכל. פרויקט נוכחי: גמר מרפסת — ממוצע תשלום 12 יום. אין חריגות ידועות.";
    }
    // Materials shortage
    if (p.includes("חומרים") || p.includes("חוסר")) {
      return "לא דווח על חוסר בחומרים קריטיים השבוע ביומני העבודה.";
    }
    // Voice transcription result (concrete/foundations/workers)
    if (
      p.includes("יציקות") || p.includes("בטון") || p.includes("יסודות") ||
      p.includes("פועלים") || p.includes("סיימנו")
    ) {
      return "יומן העבודה נשמר בהצלחה! יצרתי משימת תזכורת להשלמת 2 פועלים למחר.";
    }
    // Field log / report
    if (p.includes("דיווח") || p.includes("שטח")) {
      return "מוכן להקלטה! לחץ על המיקרופון או הקלד את הדיווח, ואני אהפוך אותו ליומן עבודה מסודר.";
    }
    // Fallback
    return "אני העוזר החכם של הפרויקט. אני לומד את הנתונים ויכול לעזור בחישובי תקציב, קריאת יומנים והפקת תובנות. במה אפשר לעזור?";
  }

  // ── English ───────────────────────────────────────────────────────────────────

  // WhatsApp draft
  if (p.includes("whatsapp")) {
    return "Here's a draft: 'Hi, just wanted to update you — we've successfully completed the foundation pour this week. Feel free to reach out with any questions!'";
  }
  // Budget / progress
  if (p.includes("budget") || p.includes("overrun") || p.includes("status")) {
    return "Based on the data, this project is at 80% budget utilization. There is a 5,000 NIS overrun in plumbing, but other sections are on track.";
  }
  // Risks
  if (p.includes("risk") || p.includes("risks")) {
    return "No critical risks detected. Weather this week is suitable for outdoor work.";
  }
  // Client: balance / invoices
  if (context === "client" && (p.includes("balance") || p.includes("invoice") || p.includes("outstanding"))) {
    return "This client has one open invoice for 15,000 NIS (Progress Payment — Frame Completion) that is unpaid.";
  }
  // Client: history
  if (context === "client" && p.includes("history")) {
    return "Active client with 3 projects total. Current project: balcony finish. Average payment time: 12 days. No known issues.";
  }
  // Materials
  if (p.includes("material") || p.includes("shortage")) {
    return "No critical material shortages were reported in the daily logs this week.";
  }
  // Voice transcription result
  if (
    p.includes("concrete") || p.includes("foundation") || p.includes("pouring") ||
    p.includes("workers") || p.includes("finished")
  ) {
    return "Daily log saved! Created a reminder task to source 2 additional workers for tomorrow.";
  }
  // Field log
  if (p.includes("log") || p.includes("field")) {
    return "Ready to record! Click the microphone or type your log, and I'll format it into a structured daily log.";
  }
  // Fallback
  return "I am the project's smart assistant. I can help with budget calculations, log reading, and insights. How can I help today?";
}
