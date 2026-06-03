/**
 * prisma/simulate-e2e.ts
 *
 * E2E simulation seed — populates the full lifecycle of a construction company:
 *   Company → Lead → Client → Project → all project tabs
 *
 * Run:
 *   npx ts-node --project tsconfig.json prisma/simulate-e2e.ts
 *
 * The script is idempotent: it checks for an existing company named
 * "בניה ישראלית בע״מ" and skips if it already exists.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const db = new PrismaClient({ adapter });

const d = (offsetDays: number): Date => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  dt.setHours(8, 0, 0, 0);
  return dt;
};

async function main() {
  console.log("\n🏗️  BuildPro E2E Simulation Seed\n");

  // ─── Guard: skip if already seeded ───────────────────────────────────────────
  const existing = await db.company.findFirst({
    where: { name: "בניה ישראלית בע״מ" },
  });
  if (existing) {
    console.log("⚠️  Company 'בניה ישראלית בע״מ' already exists — skipping seed.");
    return;
  }

  // ─── 1. Company ───────────────────────────────────────────────────────────────
  console.log("1/14  Creating company...");
  const company = await db.company.create({
    data: { name: "בניה ישראלית בע״מ" },
  });

  // ─── 2. Admin user ────────────────────────────────────────────────────────────
  console.log("2/14  Creating admin user...");
  const admin = await db.user.create({
    data: {
      companyId:    company.id,
      name:         "ישראל ישראלי",
      email:        `admin-e2e-${Date.now()}@buildpro-demo.co.il`,
      passwordHash: "$2b$10$placeholder_hash_not_real",
      role:         "ADMIN",
      phone:        "050-1234567",
    },
  });

  // ─── 3. Employees ─────────────────────────────────────────────────────────────
  console.log("3/14  Creating employees...");
  const employees = await Promise.all([
    db.employee.create({
      data: {
        companyId:  company.id,
        name:       "יוסף לוי",
        trade:      "מנהל עבודה",
        phone:      "050-9876543",
        idNumber:   `e2e-001-${Date.now()}`,
        hourlyRate: 120,
        startDate:  new Date("2020-03-01"),
      },
    }),
    db.employee.create({
      data: {
        companyId:  company.id,
        name:       "מוחמד עבאס",
        trade:      "מנופאי",
        phone:      "052-1122334",
        idNumber:   `e2e-002-${Date.now()}`,
        hourlyRate: 150,
        startDate:  new Date("2019-07-15"),
      },
    }),
    db.employee.create({
      data: {
        companyId:  company.id,
        name:       "שלמה כהן",
        trade:      "רצף",
        phone:      "054-5566778",
        idNumber:   `e2e-003-${Date.now()}`,
        hourlyRate: 90,
        startDate:  new Date("2022-01-10"),
      },
    }),
    db.employee.create({
      data: {
        companyId:  company.id,
        name:       "ג׳מאל חסן",
        trade:      "חשמלאי",
        phone:      "053-9900112",
        idNumber:   `e2e-004-${Date.now()}`,
        hourlyRate: 110,
        startDate:  new Date("2021-05-20"),
      },
    }),
    db.employee.create({
      data: {
        companyId:  company.id,
        name:       "רוני פרץ",
        trade:      "אינסטלטור",
        phone:      "050-3344556",
        idNumber:   `e2e-005-${Date.now()}`,
        hourlyRate: 100,
        startDate:  new Date("2023-03-01"),
      },
    }),
  ]);
  const [foreman, crane, tiler, electrician, plumber] = employees;

  // ─── 4. Lead ──────────────────────────────────────────────────────────────────
  console.log("4/14  Creating lead...");
  const lead = await db.lead.create({
    data: {
      companyId:        company.id,
      name:             "דוד כהן",
      phone:            "054-7654321",
      phone2:           "03-6543210",
      email:            "david.cohen@example.co.il",
      propertyAddress:  "רחוב הרצל 42, תל אביב",
      city:             "תל אביב",
      estimatedSize:    280,
      constructionTypes: ["renovation", "residential"],
      source:           "REFERRAL",
      status:           "MEETING_SCHEDULED",
      urgency:          "HIGH",
      budget:           1_200_000,
      notes:            "לקוח מומלץ מישראל כהן. מעוניין בשיפוץ מלא של דירה 6 חדרים + בנייה על הגג. יש לו תקציב ומוכן להתקדם מהר.",
      assignedToId:     admin.id,
    },
  });

  // Communication log on the lead
  await db.communicationLog.create({
    data: {
      companyId: company.id,
      type:      "MEETING",
      content:   "פגישה ראשונה עם הלקוח — הוצג הפרויקט, נדון תקציב והיקף עבודה. הלקוח אישר את הכיוון הכללי.",
      leadId:    lead.id,
      authorId:  admin.id,
    },
  });

  // ─── 5. Convert lead → client ─────────────────────────────────────────────────
  console.log("5/14  Converting lead to client...");
  const client = await db.client.create({
    data: {
      companyId:    company.id,
      name:         "דוד כהן",
      contactName:  "דוד כהן",
      phone:        "054-7654321",
      phone2:       "03-6543210",
      email:        "david.cohen@example.co.il",
      address:      "רחוב הרצל 42, תל אביב",
      companyNumber: "514123456",
      notes:        "לקוח VIP — שיפוץ מלא + בנייה על הגג",
      latitude:     32.0853,
      longitude:    34.7818,
    },
  });

  await db.lead.update({
    where: { id: lead.id },
    data:  { status: "CONVERTED", convertedAt: new Date(), convertedToId: client.id },
  });

  // ─── 6. Project ───────────────────────────────────────────────────────────────
  console.log("6/14  Creating project...");
  const project = await db.project.create({
    data: {
      companyId:       company.id,
      name:            "שיפוץ ובנייה על הגג — הרצל 42",
      description:     "שיפוץ מלא של דירת 6 חדרים, 280 מ״ר + בנייה חדשה של 2 חדרים על הגג. כולל: עבודות שלד, טיח, חשמל, אינסטלציה, גבס, ריצוף וחיפוי.",
      address:         "רחוב הרצל 42, תל אביב",
      clientId:        client.id,
      managerId:       admin.id,
      status:          "ACTIVE",
      startDate:       d(-60),
      endDate:         d(120),
      contractValue:   1_380_000,
      progressPercent: 28,
      latitude:        32.0853,
      longitude:       34.7818,
      settings: {
        create: {
          qcEnabled:          true,
          risksEnabled:       true,
          crEnabled:          true,
          milestonesEnabled:  true,
          wbsEnabled:         true,
          procurementEnabled: true,
          ganttEnabled:       true,
        },
      },
    },
  });

  // Add admin as project manager member
  await db.projectMember.create({
    data: {
      projectId: project.id,
      userId:    admin.id,
      role:      "MANAGER",
    },
  });

  // ─── 7. Milestones ────────────────────────────────────────────────────────────
  console.log("7/14  Creating milestones...");
  const milestones = await Promise.all([
    db.milestone.create({ data: { projectId: project.id, name: "השלמת עבודות הריסה ופינוי", date: d(-50), weight: 2, completed: true, completedAt: d(-48), order: 0, notes: "כל חומרי ההריסה פונו לאתר מאושר" } }),
    db.milestone.create({ data: { projectId: project.id, name: "יציקת יסודות לבנייה על הגג", date: d(-20), weight: 3, completed: true, completedAt: d(-18), order: 1, notes: "בטון 30 MPa — אושר ע״י מהנדס ד׳ זילברמן" } }),
    db.milestone.create({ data: { projectId: project.id, name: "השלמת שלד קומת גג", date: d(15), weight: 3, completed: false, completedAt: null, order: 2, notes: null } }),
    db.milestone.create({ data: { projectId: project.id, name: "סיום עבודות גמר פנים", date: d(70), weight: 3, completed: false, completedAt: null, order: 3, notes: "כולל ריצוף, טיח, צבע" } }),
    db.milestone.create({ data: { projectId: project.id, name: "מסירה ללקוח + טופס 4", date: d(120), weight: 5, completed: false, completedAt: null, order: 4, notes: "נדרש אישור עיריית תל אביב" } }),
  ]);

  // ─── 8. Tasks ─────────────────────────────────────────────────────────────────
  console.log("8/14  Creating tasks...");
  await db.task.createMany({
    data: [
      // Completed tasks
      { companyId: company.id, projectId: project.id, milestoneId: milestones[0].id, name: "פירוק ריצוף ישן — כל הדירה", priority: "HIGH",   status: "DONE",        assignedToId: foreman.id,     completedAt: d(-52), dueDate: d(-50) },
      { companyId: company.id, projectId: project.id, milestoneId: milestones[0].id, name: "הריסת קירות לא נושאים",        priority: "HIGH",   status: "DONE",        assignedToId: foreman.id,     completedAt: d(-50), dueDate: d(-48) },
      { companyId: company.id, projectId: project.id, milestoneId: milestones[1].id, name: "חפירה וחיזוק יסוד גג",         priority: "URGENT", status: "DONE",        assignedToId: crane.id,       completedAt: d(-22), dueDate: d(-20) },
      { companyId: company.id, projectId: project.id, milestoneId: milestones[1].id, name: "יציקת יסודות — עמוד A1",       priority: "HIGH",   status: "DONE",        assignedToId: foreman.id,     completedAt: d(-19), dueDate: d(-18) },
      { companyId: company.id, projectId: project.id, milestoneId: milestones[1].id, name: "יציקת יסודות — עמוד A2",       priority: "HIGH",   status: "DONE",        assignedToId: foreman.id,     completedAt: d(-18), dueDate: d(-17) },
      { companyId: company.id, projectId: project.id, milestoneId: milestones[1].id, name: "הנחת אינסטלציה תת-קרקעית",    priority: "MEDIUM", status: "DONE",        assignedToId: plumber.id,     completedAt: d(-15), dueDate: d(-14) },
      // Active tasks
      { companyId: company.id, projectId: project.id, milestoneId: milestones[2].id, name: "קירוי קומת גג — שלד פלדה",     priority: "HIGH",   status: "IN_PROGRESS", assignedToId: crane.id,       dueDate: d(10) },
      { companyId: company.id, projectId: project.id, milestoneId: milestones[2].id, name: "הנחת כלונסאות תקרה",           priority: "HIGH",   status: "IN_PROGRESS", assignedToId: foreman.id,     dueDate: d(14) },
      { companyId: company.id, projectId: project.id, name: "חיפוי חיצוני — קיר מזרח",       priority: "MEDIUM", status: "IN_PROGRESS", assignedToId: foreman.id },
      // Blocked
      { companyId: company.id, projectId: project.id, name: "אישור מהנדס קונסטרוקציה",       priority: "URGENT", status: "BLOCKED",     description: "ממתין לאישור מהנדס חיצוני ד׳ זילברמן — חוות דעת על שינוי תכנון גג", dueDate: d(5) },
      // Upcoming
      { companyId: company.id, projectId: project.id, milestoneId: milestones[3].id, name: "התקנת לוח חשמל ראשי",          priority: "HIGH",   status: "TODO",        assignedToId: electrician.id, dueDate: d(25) },
      { companyId: company.id, projectId: project.id, milestoneId: milestones[3].id, name: "הנחת צנרת חשמל — קומת גג",     priority: "HIGH",   status: "TODO",        assignedToId: electrician.id, dueDate: d(30) },
      { companyId: company.id, projectId: project.id, milestoneId: milestones[3].id, name: "טיח פנים — כל חדרי הדירה",     priority: "MEDIUM", status: "TODO",        dueDate: d(40) },
      { companyId: company.id, projectId: project.id, milestoneId: milestones[3].id, name: "ריצוף סלון ופינת אוכל — פורצלן 90x90", priority: "MEDIUM", status: "TODO", assignedToId: tiler.id, dueDate: d(55) },
      { companyId: company.id, projectId: project.id, milestoneId: milestones[3].id, name: "ריצוף חדרי שינה — פרקט",       priority: "LOW",    status: "TODO",        assignedToId: tiler.id, dueDate: d(60) },
      { companyId: company.id, projectId: project.id, milestoneId: milestones[3].id, name: "צביעה — כל הדירה",             priority: "LOW",    status: "TODO",        dueDate: d(70) },
      { companyId: company.id, projectId: project.id, milestoneId: milestones[3].id, name: "התקנת מטבח",                   priority: "MEDIUM", status: "TODO",        dueDate: d(75) },
      { companyId: company.id, projectId: project.id, milestoneId: milestones[4].id, name: "בדיקת אטימות גג",              priority: "HIGH",   status: "TODO",        dueDate: d(100) },
      { companyId: company.id, projectId: project.id, milestoneId: milestones[4].id, name: "ניקיון סופי ומסירה",            priority: "MEDIUM", status: "TODO",        dueDate: d(118) },
    ],
  });

  // ─── 9. Daily Logs (Field Reports) ───────────────────────────────────────────
  console.log("9/14  Creating daily logs...");
  const logDates = [-5, -4, -3, -2, -1, 0].map((o) => d(o));
  const weathers = ["בהיר, 28°C", "מעונן חלקית, 24°C", "ערפל בוקר — ניקה", "בהיר, 31°C", "חם ולח, 34°C", "בהיר, 27°C"];
  const logsNotes = [
    "הניפוי של שלד הגג בעמוד A1-A4 הסתיים. 12 פועלים באתר.",
    "ריתוך קורות תקרה — קצב עבודה תקין. פגם קטן בריתוך B3 — תוקן במקום.",
    "הנחת כלונסאות בקיר מזרח הושלמה. הותחלה עבודת גבס בחדר שינה 1.",
    "יציקת בטון לתקרת קומת הגג — 14 מ׳ רבועים. בטון 30 MPa.",
    "עיכוב קל עקב תחנת מכוח תפוסה — עבודה חזרה לאחר הפסקת צהריים.",
    "בדיקת מפקח עיריה — עברה בהצלחה. ניתן להמשיך.",
  ];

  for (let i = 0; i < logDates.length; i++) {
    await db.dailyLog.create({
      data: {
        companyId:        company.id,
        projectId:        project.id,
        supervisorId:     admin.id,
        date:             logDates[i],
        weatherConditions: weathers[i],
        visitors:         i % 3 === 0 ? "מפקח עיריה, מהנדס לקוח" : null,
        safetyIncidents:  null,
        notes:            logsNotes[i],
      },
    });
  }

  // ─── 10. Time Entries ─────────────────────────────────────────────────────────
  console.log("10/14 Creating time entries...");
  const timeEntryData: Array<{ employeeId: string; date: Date; hours: number; hourlyRate: number; description: string }> = [];
  const empHourlyRates: Record<string, number> = {
    [foreman.id]:     120,
    [crane.id]:       150,
    [tiler.id]:       90,
    [electrician.id]: 110,
    [plumber.id]:     100,
  };
  const empDescriptions: Record<string, string> = {
    [foreman.id]:     "פיקוח ועבודת שלד",
    [crane.id]:       "הפעלת מנוף — הנחת קורות",
    [tiler.id]:       "הכנת משטח לריצוף",
    [electrician.id]: "הנחת צינורות חשמל",
    [plumber.id]:     "הנחת צנרת מים",
  };

  for (let offset = -30; offset <= -1; offset++) {
    if (offset % 7 === 0 || offset % 7 === 6) continue; // skip weekends
    const dayEmployees = [foreman, crane, tiler, electrician, plumber].filter((_, i) => i % 3 !== (Math.abs(offset) % 3));
    for (const emp of dayEmployees) {
      const hours = 8 + (Math.abs(offset) % 3);
      timeEntryData.push({
        employeeId:  emp.id,
        date:        d(offset),
        hours,
        hourlyRate:  empHourlyRates[emp.id],
        description: empDescriptions[emp.id],
      });
    }
  }

  await db.timeEntry.createMany({
    data: timeEntryData.map((te) => ({
      projectId:   project.id,
      employeeId:  te.employeeId,
      date:        te.date,
      hours:       te.hours,
      hourlyRate:  te.hourlyRate,
      totalCost:   te.hours * te.hourlyRate,
      description: te.description,
      approved:    true,
      approvedById: admin.id,
      approvedAt:  new Date(),
    })),
  });

  // ─── 11. Expenses ─────────────────────────────────────────────────────────────
  await db.expense.createMany({
    data: [
      { projectId: project.id, employeeId: foreman.id,  date: d(-28), amount: 4_800,  category: "MATERIALS",  description: "שקים בטון 30 MPa — 40 שקים, חברת קדם-בטון" },
      { projectId: project.id, employeeId: crane.id,    date: d(-25), amount: 1_200,  category: "FUEL",       description: "תדלוק מנוף הידראולי — 300 ליטר סולר" },
      { projectId: project.id, employeeId: foreman.id,  date: d(-22), amount: 12_500, category: "MATERIALS",  description: "פרופילי פלדה — 8 טון, מוט הברזל 12 מ״מ" },
      { projectId: project.id, employeeId: plumber.id,  date: d(-18), amount: 3_200,  category: "MATERIALS",  description: "צינורות PPR + אביזרים — מחסן בית חרוצים" },
      { projectId: project.id, date: d(-15), amount: 650,    category: "MEALS",      description: "ארוחות צוות — אירוע יציקה" },
      { projectId: project.id, employeeId: foreman.id,  date: d(-12), amount: 2_800,  category: "TOOLS",      description: "השכרת קידוח ותקרה — שבועיים" },
      { projectId: project.id, employeeId: electrician.id, date: d(-10), amount: 5_400, category: "MATERIALS", description: "צינורות חשמל, קופסאות + כבלים 2.5 מ״מ" },
      { projectId: project.id, date: d(-8),  amount: 1_800,  category: "TRANSPORT",  description: "הובלת חומרים מאתר — 2 נסיעות שאגיל" },
      { projectId: project.id, employeeId: tiler.id,    date: d(-5),  amount: 18_200, category: "MATERIALS",  description: "אריחי פורצלן גריסטה 90x90 — 320 מ״ר" },
      { projectId: project.id, date: d(-3),  amount: 450,    category: "OTHER",      description: "אגרת היתר בנייה תוספת" },
    ],
  });

  // ─── 12. Quality Checks & NCRs ────────────────────────────────────────────────
  console.log("11/14 Creating QC checks and NCRs...");
  await db.qualityCheck.createMany({
    data: [
      { projectId: project.id, type: "בדיקת יציקת בטון — יסודות גג", result: "PASS", inspector: "מהנדס ד׳ זילברמן", notes: "בטון 30 MPa — עבר תקן ישראלי 1152", date: d(-18) },
      { projectId: project.id, type: "ריתוך עמודי פלדה — גוש A",      result: "PASS", inspector: "מהנדס גיל כהן",     notes: "כל 8 עמודים — ריתוך תקין לפי ISO 3834", date: d(-12) },
      { projectId: project.id, type: "מבחן לחץ צנרת מים — 8 בר",      result: "FAIL", inspector: "מפקח עיריה",       notes: "דליפה קטנה בגוש B — פניה לקבלן אינסטלציה לתיקון", date: d(-7) },
      { projectId: project.id, type: "מבחן לחץ צנרת מים — חזרה",      result: "PASS", inspector: "מפקח עיריה",       notes: "תוקן ועבר בהצלחה", date: d(-4) },
      { projectId: project.id, type: "בדיקת ריצוף לובי כניסה",         result: "PENDING", inspector: null,             notes: null, date: d(0) },
    ],
  });

  await db.nCR.createMany({
    data: [
      { projectId: project.id, description: "חריגה בעובי בטון — עמוד A3: 18 ס״מ במקום 22 ס״מ", severity: "HIGH",   status: "IN_PROGRESS", assignedTo: "יוסף לוי", date: d(-15) },
      { projectId: project.id, description: "ריצוף לא ישר בלובי — חריגה של 3 מ״מ",            severity: "LOW",    status: "CLOSED",      resolution: "הוסר ורוצף מחדש", closedAt: d(-5), date: d(-20) },
      { projectId: project.id, description: "חוסר מסמרים בקורת גג — גוש C שורה 2",            severity: "MEDIUM", status: "OPEN",        date: d(-3) },
    ],
  });

  // ─── 13. Risks ────────────────────────────────────────────────────────────────
  console.log("12/14 Creating risks...");
  await db.risk.createMany({
    data: [
      { projectId: project.id, description: "עיכוב בקבלת חלונות SCHÜCO — ייצור בגרמניה",                     probability: 4, impact: 4, mitigation: "הזמנה מוקדמת ב-16 שבועות — אישור מהספק בדוא״ל", status: "OPEN" },
      { projectId: project.id, description: "גשמים חזקים — חורף מאוחר",                                       probability: 3, impact: 2, mitigation: "ריפוד 10 ימים בלוח זמנים, כיסוי פלסטיק לחומרים", status: "MITIGATED" },
      { projectId: project.id, description: "שינוי דרישות לקוח לאחר תחילת גמר (טייל במקום פורצלן בסלון)",   probability: 2, impact: 3, mitigation: "חוזה עם סעיף שינויים — כל שינוי בכתב + הזמנת שינוי חתומה",  status: "OPEN" },
      { projectId: project.id, description: "עיכוב טופס 4 עקב פקק ברשות הרישוי",                             probability: 3, impact: 5, mitigation: "פנייה מוקדמת ל-60 יום לפני סיום, עורך דין מלווה",       status: "OPEN" },
      { projectId: project.id, description: "מחסור בעובדי ריצוף — עונת שיא",                                  probability: 3, impact: 3, mitigation: "קבלן משנה ממתין חתם על זמינות",                        status: "CLOSED" },
    ],
  });

  // ─── 14. Change Requests ──────────────────────────────────────────────────────
  await db.changeRequest.createMany({
    data: [
      { projectId: project.id, description: "הוספת ממ״ד בקומת גג — נדרש ע״י עיריה", requestedBy: "דוד כהן",     costImpact: 48_000, scheduleImpact: 14, status: "APPROVED", date: d(-40), approvedAt: d(-35) },
      { projectId: project.id, description: "שינוי גמר קיר חיצוני — מטיח לאבן ירושלמית", requestedBy: "דוד כהן", costImpact: 38_000, scheduleImpact: 10, status: "PENDING",  date: d(-10) },
      { projectId: project.id, description: "הרחבת מרפסת גג ב-8 מ״ר",              requestedBy: "שרה כהן",     costImpact: 22_000, scheduleImpact: 7,  status: "REJECTED", date: d(-30) },
    ],
  });

  // ─── 15. Subcontractor + Contract ─────────────────────────────────────────────
  console.log("13/14 Creating suppliers, contracts, and invoices...");
  const electricSub = await db.supplier.create({
    data: {
      companyId:   company.id,
      name:        "אלקטרו-פרו בע״מ",
      contactName: "ניסים אלעזר",
      phone:       "03-5551234",
      email:       "nisim@electropro.co.il",
      type:        "SUBCONTRACTOR",
      rating:      5,
      notes:       "קבלן חשמל מומחה — 20 שנות ניסיון",
      active:      true,
    },
  });

  const plumbSub = await db.supplier.create({
    data: {
      companyId:   company.id,
      name:        "מנגל-אינסטל ת.א.",
      contactName: "ערן מנגל",
      phone:       "052-9988776",
      type:        "SUBCONTRACTOR",
      rating:      4,
      active:      true,
    },
  });

  const electricContract = await db.contract.create({
    data: {
      companyId:        company.id,
      projectId:        project.id,
      supplierId:       electricSub.id,
      description:      "עבודות חשמל מלאות — קומת גג + שיפוץ דירה",
      value:            145_000,
      startDate:        d(-10),
      endDate:          d(80),
      status:           "ACTIVE",
      retentionPercent: 5,
      paidAmount:       50_000,
    },
  });

  await db.supplierPayment.create({
    data: {
      contractId: electricContract.id,
      date:       d(-15),
      amount:     50_000,
      reference:  "העברה בנקאית 2024-001",
      notes:      "תשלום ראשון — 35% מהחוזה",
    },
  });

  const plumbContract = await db.contract.create({
    data: {
      companyId:        company.id,
      projectId:        project.id,
      supplierId:       plumbSub.id,
      description:      "עבודות אינסטלציה מלאות — מים וביוב",
      value:            68_000,
      startDate:        d(-20),
      endDate:          d(60),
      status:           "ACTIVE",
      retentionPercent: 5,
      paidAmount:       34_000,
    },
  });

  await db.supplierPayment.create({
    data: {
      contractId: plumbContract.id,
      date:       d(-10),
      amount:     34_000,
      reference:  "העברה בנקאית 2024-002",
      notes:      "תשלום ראשון — 50% מהחוזה",
    },
  });

  // ─── 16. Invoices + Payments ──────────────────────────────────────────────────
  const inv1 = await db.invoice.create({
    data: {
      companyId:     company.id,
      clientId:      client.id,
      projectId:     project.id,
      invoiceNumber: `E2E-INV-001-${Date.now()}`,
      description:   "חשבון מצב 1 — עבודות הריסה, עפר ויסודות גג",
      date:          d(-45),
      dueDate:       d(-15),
      status:        "PAID",
      amount:        350_000,
      taxPercent:    17,
      taxAmount:     59_500,
      total:         409_500,
      paidAmount:    409_500,
      notes:         "תשלום בהתאם לאבן דרך 1+2",
    },
  });

  await db.payment.create({
    data: {
      invoiceId: inv1.id,
      date:      d(-14),
      amount:    409_500,
      method:    "BANK_TRANSFER",
      reference: "העברה BL-2024-0891",
    },
  });

  const inv2 = await db.invoice.create({
    data: {
      companyId:     company.id,
      clientId:      client.id,
      projectId:     project.id,
      invoiceNumber: `E2E-INV-002-${Date.now()}`,
      description:   "חשבון מצב 2 — שלד קומת גג + גמר חלקי",
      date:          d(-10),
      dueDate:       d(20),
      status:        "PARTIALLY_PAID",
      amount:        280_000,
      taxPercent:    17,
      taxAmount:     47_600,
      total:         327_600,
      paidAmount:    150_000,
      notes:         "שולם 50% — יתרה עד מועד הדדליין",
    },
  });

  await db.payment.create({
    data: {
      invoiceId: inv2.id,
      date:      d(-5),
      amount:    150_000,
      method:    "CHECK",
      reference: "שיק מס׳ 10045",
    },
  });

  const inv3 = await db.invoice.create({
    data: {
      companyId:     company.id,
      clientId:      client.id,
      projectId:     project.id,
      invoiceNumber: `E2E-INV-003-${Date.now()}`,
      description:   "חשבון מצב 3 — חשמל, אינסטלציה, ריצוף",
      date:          d(0),
      dueDate:       d(30),
      status:        "SENT",
      amount:        200_000,
      taxPercent:    17,
      taxAmount:     34_000,
      total:         234_000,
      paidAmount:    0,
      notes:         null,
    },
  });

  // ─── 17. WBS / Work Packages ──────────────────────────────────────────────────
  await db.workPackage.createMany({
    data: [
      { projectId: project.id, name: "עבודות הריסה ופינוי",       plannedCost: 85_000,  actualCost: 88_200,  completionPercent: 100, startDate: d(-60), endDate: d(-45), order: 0 },
      { projectId: project.id, name: "עבודות עפר ויסודות",        plannedCost: 120_000, actualCost: 118_500, completionPercent: 100, startDate: d(-50), endDate: d(-20), order: 1 },
      { projectId: project.id, name: "שלד קומת גג",               plannedCost: 220_000, actualCost: 145_000, completionPercent: 65,  startDate: d(-20), endDate: d(20),  order: 2 },
      { projectId: project.id, name: "עבודות חשמל",               plannedCost: 145_000, actualCost: 50_000,  completionPercent: 30,  startDate: d(-10), endDate: d(80),  order: 3 },
      { projectId: project.id, name: "עבודות אינסטלציה",          plannedCost: 68_000,  actualCost: 34_000,  completionPercent: 50,  startDate: d(-20), endDate: d(60),  order: 4 },
      { projectId: project.id, name: "עבודות גמר — ריצוף וחיפוי", plannedCost: 180_000, actualCost: 18_200,  completionPercent: 10,  startDate: d(20),  endDate: d(80),  order: 5 },
      { projectId: project.id, name: "עבודות גמר — טיח וצבע",    plannedCost: 95_000,  actualCost: 0,        completionPercent: 0,   startDate: d(40),  endDate: d(90),  order: 6 },
      { projectId: project.id, name: "ניקיון ומסירה",             plannedCost: 15_000,  actualCost: 0,        completionPercent: 0,   startDate: d(110), endDate: d(120), order: 7 },
    ],
  });

  // ─── 18. Activity logs ────────────────────────────────────────────────────────
  console.log("14/14 Creating activity logs...");
  await db.activityLog.createMany({
    data: [
      { companyId: company.id, userId: admin.id, action: "PROJECT_CREATED",  entityType: "PROJECT",  entityId: project.id, details: JSON.stringify({ description: `ישראל ישראלי יצר פרויקט "${project.name}"` }) },
      { companyId: company.id, userId: admin.id, action: "INVOICE_CREATED",  entityType: "INVOICE",  entityId: inv1.id,    details: JSON.stringify({ description: `חשבון מצב 1 נוצר — ₪409,500` }) },
      { companyId: company.id, userId: admin.id, action: "PAYMENT_RECEIVED", entityType: "INVOICE",  entityId: inv1.id,    details: JSON.stringify({ description: `תקבול ₪409,500 על חשבונית E2E-INV-001` }) },
      { companyId: company.id, userId: admin.id, action: "INVOICE_CREATED",  entityType: "INVOICE",  entityId: inv2.id,    details: JSON.stringify({ description: `חשבון מצב 2 נוצר — ₪327,600` }) },
      { companyId: company.id, userId: admin.id, action: "INVOICE_CREATED",  entityType: "INVOICE",  entityId: inv3.id,    details: JSON.stringify({ description: `חשבון מצב 3 נוצר — ₪234,000` }) },
      { companyId: company.id, userId: admin.id, action: "TASK_STATUS_CHANGED", entityType: "TASK", details: JSON.stringify({ description: `ישראל ישראלי עדכן סטטוס "יציקת יסודות — עמוד A1" להושלם` }) },
      { companyId: company.id, userId: admin.id, action: "RISK_CREATED",     entityType: "RISK",     details: JSON.stringify({ description: `סיכון: עיכוב בקבלת חלונות נוצר` }) },
    ],
  });

  // ─── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n✅  E2E seed completed successfully!\n");
  console.log(`Company    : ${company.name} (${company.id})`);
  console.log(`Admin User : ${admin.name} <${admin.email}>`);
  console.log(`Client     : ${client.name} (${client.id})`);
  console.log(`Project    : ${project.name} (${project.id})`);
  console.log(`Employees  : ${employees.length} created`);
  console.log(`Milestones : ${milestones.length} created`);
  console.log(`Daily Logs : ${logDates.length} created`);
  console.log(`Invoices   : 3 (₪409,500 PAID + ₪327,600 PARTIALLY_PAID + ₪234,000 SENT)`);
  console.log(`Contracts  : 2 (electric ₪145k + plumbing ₪68k)`);
  console.log("\n👉  Log in as admin-e2e-*@buildpro-demo.co.il to see the full simulation.");
  console.log(`👉  Or browse project at /projects/${project.id}\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
