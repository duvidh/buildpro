"use server";

// Simulates a ~600-900 ms AI round-trip for realism.
function delay() {
  return new Promise<void>((r) => setTimeout(r, 600 + Math.random() * 300));
}

export async function askProjectAI(
  prompt: string,
  _projectId: string,
  locale: "he" | "en",
): Promise<string> {
  await delay();

  const p = prompt.toLowerCase();

  if (locale === "he") {
    if (p.includes("תקציב") || p.includes("חריגות") || p.includes("חריגה")) {
      return 'לפי הנתונים, פרויקט זה נמצא ב-80% ניצול תקציב. קיימת חריגה של 5,000 ש"ח בסעיף אינסטלציה, אך שאר הסעיפים תקינים.';
    }
    if (p.includes("חומרים") || p.includes("חוסר")) {
      return "לא דווח על חוסר בחומרים קריטיים השבוע ביומני העבודה.";
    }
    if (p.includes("דיווח") || p.includes("שטח")) {
      return "מוכן להקלטה! לחץ על המיקרופון (בקרוב) או הקלד את הדיווח, ואני אהפוך אותו ליומן עבודה מסודר.";
    }
    return "אני העוזר החכם של הפרויקט. אני לומד את הנתונים ויכול לעזור בחישובי תקציב, קריאת יומנים והפקת תובנות. במה אפשר לעזור?";
  }

  // English
  if (p.includes("budget") || p.includes("overrun")) {
    return "Based on the data, this project is at 80% budget utilization. There is a 5,000 NIS overrun in plumbing, but other sections are on track.";
  }
  if (p.includes("material") || p.includes("shortage")) {
    return "No critical material shortages were reported in the daily logs this week.";
  }
  if (p.includes("log") || p.includes("field")) {
    return "Ready to record! Click the microphone (coming soon) or type your log, and I'll format it into a structured daily log.";
  }
  return "I am the project's smart assistant. I can help with budget calculations, log reading, and insights. How can I help today?";
}
