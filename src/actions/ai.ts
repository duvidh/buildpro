"use server";

export type AIContext = "project" | "client" | "generic";

// Simulates a ~700–1100 ms AI round-trip (slightly longer for richer responses).
function delay() {
  return new Promise<void>((r) => setTimeout(r, 700 + Math.random() * 400));
}

// ─── Response library ─────────────────────────────────────────────────────────

const R = {
  he: {
    payments: `מתוך נתוני המערכת של החברה — סיכום פיננסי:

💰 פרויקט נוכחי
────────────────────
תקציב: 1,200,000 ש"ח
שולם עד כה: 480,000 ש"ח (40%)
נותר לגבייה: 720,000 ש"ח

📄 חשבוניות פתוחות:
• חשבון עסקה #142 — 85,000 ש"ח
  (גמר שלד | ממתינה לאישור לקוח)

⚠️ תשלום #3 — 15.06 — טרם התקבל (14 יום באיחור)

────────────────────
האם תרצה שאפיק דוח גיול חובות מלא?`,

    task: `✅ משימה נוצרה ונרשמה במערכת

פרטי המשימה:
• כותרת: "להביא צינורות 4 צול לאינסטלטור"
• עדיפות: 🔴 דחופה
• מיועד ל: מנהל עבודה — אביחי כהן
• תאריך יעד: מחר עד 08:00
• מקושר לפרויקט: גמר שלד ב׳

📳 אזכור נשלח לאביחי ✓

רוצה להוסיף הערות או לשנות את הנמען?`,

    budget: `מתוך נתוני המערכת — סטטוס פרויקט:

📊 התקדמות: 72% הושלם
🗓️ שלב נוכחי: שלד קומה ב׳

תקציב:
• מנוצל: 80% (960K / 1.2M ש"ח)
• חריגה — אינסטלציה: +5,000 ש"ח
• שאר הסעיפים: תקינים ✓

⏳ אבן דרך הבאה:
אישור מהנדס קומה ב׳ — יעד 20.06

💡 קצב ביצוע תקין — לוח הזמנים שמור.`,

    whatsapp: `הנה טיוטת הודעה ללקוח:

📱 ─────────────────────
"שלום [שם לקוח],

עדכון שבועי מהצוות:
✅ שלד קומה א׳ — הושלם
🔜 הבא: גמר קומה א׳ (מתחיל יום ג׳)
📅 בלוח הזמנים

לשאלות — תמיד זמינים! 🏗️"
─────────────────────

(ערוך לפי הצורך ושלח ישירות מהסלולר)`,

    risks: `סריקת סיכונים — נתוני מערכת:

✅ סיכונים קריטיים: אין
────────────────────
⚠️ התרעות פעילות:
• 🌧️ גשם צפוי ביום ה׳ — תכנן עבודות פנים
• 👷 2 פועלים חסרים לסוף השבוע
• 📦 אזל מלאי דיקטים — הזמנה בתהליך

💡 המלצה:
אשר ספק חלופי לדיקטים עד יום ג׳ בבוקר.`,

    materials: `מתוך יומני העבודה — שבוע נוכחי:

📦 מצב חומרים:
• בטון: מלאי תקין ✓
• ברזל: מלאי תקין ✓
• דיקטים: ⚠️ מלאי אפס — הזמנה בתהליך
• אינסטלציה: תקין ✓

✅ אין חוסרים קריטיים שמשפיעים על לוח הזמנים.
צפי לקבלת דיקטים: יום ד׳`,

    voiceTask: `✅ נרשם בהצלחה במערכת!

📋 יומן עבודה — היום:
"משימה דחופה זוהתה בדיווח הקולי."

➕ משימה שנוצרה אוטומטית:
• "להביא צינורות 4 צול לאינסטלטור"
• עדיפות: 🔴 דחוף | יעד: מחר 08:00

📳 אזכור נשלח למנהל העבודה ✓`,

    voiceLog: `✅ יומן עבודה נשמר!

📋 דיווח היום:
• ריצוף קומה א׳: הושלם ✓
• מצב כללי: תקין
• המשך: מחר

📊 התקדמות הפרויקט עודכנה אוטומטית.
רוצה לשייך לאבן דרך? שאל אותי!`,

    voiceLegacy: `✅ יומן העבודה נשמר!

📋 דיווח היום:
• סיום יציקות הבטון והיסודות ✓
• מצב כללי: תקין

➕ משימה שנוצרה: "לדאוג ל-2 פועלים נוספים למחר"
📳 אזכור נשלח למנהל העבודה ✓`,

    clientBalance: `מתוך נתוני המערכת — לקוח נוכחי:

💰 יתרת חוב כוללת: 100,000 ש"ח
────────────────────
חשבוניות פתוחות:
• חשבון #142 — 85,000 ש"ח
  (גמר שלד | פגה 15.06 — ⚠️ 14 יום באיחור)
• חשבון #138 — 15,000 ש"ח
  (מקדמה | פגה 01.06 — ⚠️ 28 יום באיחור)

────────────────────
האם תרצה שאנסח תזכורת תשלום ללקוח?`,

    clientHistory: `פרופיל לקוח — נתוני מערכת:

👤 לקוח פעיל
────────────────────
פרויקטים (3 סה"כ):
• 🔨 נוכחי: גמר מרפסת (בביצוע)
• ✅ שיפוץ מטבח — הושלם 2024
• ✅ הרחבת מרתף — הושלם 2023

📊 תשלומים:
• ממוצע ימי תשלום: 12 יום ✓
• סה"כ שולם: 320,000 ש"ח

────────────────────
💡 לקוח אמין — ניהול רגיל מומלץ.`,

    fallback: `שלום! אני העוזר החכם של החברה, מחובר לנתוני המערכת שלכם.

אני יכול לעזור ב:
📊 סטטוס פרויקט ותקציב
💰 מצב תשלומים וחשבוניות
📋 יצירת משימות ויומני עבודה
📱 ניסוח הודעות ללקוחות
⚠️ ניהול סיכונים

במה אפשר לעזור?`,
  },

  en: {
    payments: `From the company's secure system — Financial Summary:

💰 Current Project
────────────────────
Budget: ₪1,200,000
Paid to date: ₪480,000 (40%)
Remaining to collect: ₪720,000

📄 Open Invoices:
• Invoice #142 — ₪85,000
  (Frame completion | Awaiting client approval)

⚠️ Payment #3 — Jun 15 — Not yet received (14 days overdue)

────────────────────
Would you like me to generate a full accounts-receivable aging report?`,

    task: `✅ Task created and logged in the system

Task details:
• Title: "Bring 4-inch pipes for the plumber"
• Priority: 🔴 Urgent
• Assigned to: Site Manager — Avichai Cohen
• Due: Tomorrow by 08:00
• Linked to: Frame Stage 2

📳 Notification sent to Avichai ✓

Would you like to add notes or reassign?`,

    budget: `From the company's system — Project Status:

📊 Progress: 72% complete
🗓️ Current phase: Frame, Floor 2

Budget:
• Utilization: 80% (₪960K / ₪1.2M)
• Overrun — Plumbing: +₪5,000
• All other sections: on track ✓

⏳ Next milestone:
Structural sign-off, Floor 2 — due Jun 20

💡 Execution pace is on schedule.`,

    whatsapp: `Here's a client update draft:

📱 ─────────────────────
"Hi [Client Name],

Weekly update from the team:
✅ Floor 1 frame — completed
🔜 Next: Floor 1 finishing work (starts Tuesday)
📅 On schedule

Questions? We're always available! 🏗️"
─────────────────────

(Edit as needed and send directly from your phone)`,

    risks: `Risk Scan — System Data:

✅ Critical risks: None
────────────────────
⚠️ Active alerts:
• 🌧️ Rain expected Thursday — plan indoor work
• 👷 2 workers short for the weekend
• 📦 Plywood stock depleted — reorder in progress

💡 Recommendation:
Confirm alternative plywood supplier by Tuesday morning.`,

    materials: `From the daily logs — current week:

📦 Material Status:
• Concrete: stocked ✓
• Rebar: stocked ✓
• Plywood: ⚠️ Zero stock — reorder in progress
• Plumbing supplies: stocked ✓

✅ No critical shortages impacting the schedule.
Plywood expected: Wednesday`,

    voiceTask: `✅ Logged successfully!

📋 Daily log — Today:
"Urgent task identified in voice report."

➕ Task auto-created:
• "Bring 4-inch pipes for the plumber"
• Priority: 🔴 Urgent | Due: Tomorrow 08:00

📳 Notification sent to site manager ✓`,

    voiceLog: `✅ Daily log saved!

📋 Today's report:
• Floor 1 tiling: completed ✓
• Overall status: all good
• Continuing: tomorrow

📊 Project progress updated automatically.
Want to link this to a milestone? Just ask!`,

    voiceLegacy: `✅ Daily log saved!

📋 Today's report:
• Foundation pour: completed ✓
• Overall status: all good

➕ Task created: "Source 2 additional workers for tomorrow"
📳 Notification sent to site manager ✓`,

    clientBalance: `From the company's system — Current Client:

💰 Total outstanding: ₪100,000
────────────────────
Open invoices:
• Invoice #142 — ₪85,000
  (Frame completion | Due Jun 15 — ⚠️ 14 days overdue)
• Invoice #138 — ₪15,000
  (Deposit | Due Jun 1 — ⚠️ 28 days overdue)

────────────────────
Would you like me to draft a payment reminder?`,

    clientHistory: `Client Profile — System Data:

👤 Active client
────────────────────
Projects (3 total):
• 🔨 Current: Balcony finishing (in progress)
• ✅ Kitchen renovation — completed 2024
• ✅ Basement extension — completed 2023

📊 Payment history:
• Avg. days to pay: 12 days ✓
• Total paid to company: ₪320,000

────────────────────
💡 Reliable client — standard management recommended.`,

    fallback: `Hello! I'm the company's smart assistant, connected to your system data.

I can help with:
📊 Project status & budget
💰 Payments & invoices
📋 Task creation & daily logs
📱 Client communication drafts
⚠️ Risk management

What can I help you with?`,
  },
} as const;

// ─── Action ───────────────────────────────────────────────────────────────────

export async function askProjectAI(
  prompt: string,
  _entityId: string,
  context: AIContext,
  locale: "he" | "en",
): Promise<string> {
  await delay();

  const p = prompt.toLowerCase();
  const r = R[locale];

  if (locale === "he") {
    // Payments / financial summary (before budget so it's caught first)
    if (p.includes("תשלומים") || p.includes("פיננסי") || p.includes("גיול")) {
      return r.payments;
    }
    // Task creation
    if (p.includes("משימה") || p.includes("ליצור") || p.includes("פתוח משימה")) {
      return r.task;
    }
    // WhatsApp draft
    if (p.includes("whatsapp")) {
      return r.whatsapp;
    }
    // Budget / progress
    if (p.includes("תקציב") || p.includes("חריגות") || p.includes("חריגה") || p.includes("התקדמות") || p.includes("סטטוס")) {
      return r.budget;
    }
    // Risks
    if (p.includes("סיכונים") || p.includes("סיכון")) {
      return r.risks;
    }
    // Materials
    if (p.includes("חומרים") || p.includes("חוסר")) {
      return r.materials;
    }
    // Client: balance / invoices
    if (context === "client" && (p.includes("חובות") || p.includes("חשבוניות") || p.includes("יתרה") || p.includes("פתוחות"))) {
      return r.clientBalance;
    }
    // Client: history
    if (context === "client" && p.includes("היסטוריה")) {
      return r.clientHistory;
    }
    // Voice: task transcription (pipes / plumber)
    if (p.includes("צינורות") || p.includes("אינסטלטור")) {
      return r.voiceTask;
    }
    // Voice: log transcription (tiling / progress)
    if (p.includes("ריצוף") || (p.includes("קומה") && p.includes("התקדמות"))) {
      return r.voiceLog;
    }
    // Voice: legacy transcription (concrete / foundations / workers)
    if (p.includes("יציקות") || p.includes("בטון") || p.includes("יסודות") || p.includes("פועלים") || p.includes("סיימנו")) {
      return r.voiceLegacy;
    }
    // Field log / report
    if (p.includes("דיווח") || p.includes("שטח")) {
      return "מוכן להקלטה! לחץ על המיקרופון או הקלד את הדיווח, ואני אהפוך אותו ליומן עבודה מסודר.";
    }
    return r.fallback;
  }

  // ── English ──────────────────────────────────────────────────────────────────

  // Payments / financial summary
  if (p.includes("payment") || p.includes("financial") || p.includes("aging")) {
    return r.payments;
  }
  // Task creation
  if (p.includes("create task") || p.includes("task") || p.includes("open task")) {
    return r.task;
  }
  // WhatsApp draft
  if (p.includes("whatsapp")) {
    return r.whatsapp;
  }
  // Budget / progress
  if (p.includes("budget") || p.includes("overrun") || p.includes("status") || p.includes("progress")) {
    return r.budget;
  }
  // Risks
  if (p.includes("risk") || p.includes("risks")) {
    return r.risks;
  }
  // Materials
  if (p.includes("material") || p.includes("shortage")) {
    return r.materials;
  }
  // Client: balance / invoices
  if (context === "client" && (p.includes("balance") || p.includes("invoice") || p.includes("outstanding"))) {
    return r.clientBalance;
  }
  // Client: history
  if (context === "client" && p.includes("history")) {
    return r.clientHistory;
  }
  // Voice: task transcription (pipes / plumber)
  if (p.includes("pipes") || p.includes("plumber")) {
    return r.voiceTask;
  }
  // Voice: log transcription (tiling / floor)
  if (p.includes("tiling") || (p.includes("floor") && p.includes("progress"))) {
    return r.voiceLog;
  }
  // Voice: legacy transcription (concrete / foundations / workers)
  if (p.includes("concrete") || p.includes("foundation") || p.includes("pouring") || p.includes("workers") || p.includes("finished")) {
    return r.voiceLegacy;
  }
  // Field log
  if (p.includes("log") || p.includes("field")) {
    return "Ready to record! Click the microphone or type your log, and I'll format it into a structured daily log.";
  }
  return r.fallback;
}
