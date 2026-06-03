import { db } from "@/lib/db";

const d = (offsetDays: number): Date => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  dt.setHours(8, 0, 0, 0);
  return dt;
};

const DICT = {
  en: {
    projectName: "42 Herzl St - Roof Renovation",
    projectDescription:
      "Full renovation of a 6-room apartment, 280 sqm + new construction of 2 rooms on the roof. Includes: framing, plaster, electrical, plumbing, drywall, tiling and cladding.",
    projectAddress: "42 Herzl St, Tel Aviv",
    clientName: "David Cohen",
    clientContactName: "David Cohen",
    clientAddress: "42 Herzl St, Tel Aviv",
    clientCompanyNumber: "514123456",
    clientNotes: "VIP client — full renovation + roof construction",
    leadName: "David Cohen",
    leadAddress: "42 Herzl St, Tel Aviv",
    leadCity: "Tel Aviv",
    leadNotes:
      "Referral from Israel Cohen. Interested in full renovation of 6-room apartment + roof construction. Has budget and ready to move fast.",
    communicationContent:
      "First meeting with the client — project presented, budget and scope discussed. Client confirmed the general direction.",
    foremanName: "Joseph Levy",
    foremanTrade: "Site Foreman",
    craneName: "Mohammad Abbas",
    craneTrade: "Crane Operator",
    tilerName: "Solomon Cohen",
    tilerTrade: "Tiler",
    electricianName: "Jamal Hassan",
    electricianTrade: "Electrician",
    plumberName: "Roni Peretz",
    plumberTrade: "Plumber",
    milestoneNames: [
      "Completion of demolition and clearance",
      "Pour roof foundations",
      "Complete roof floor framing",
      "Complete interior finishing",
      "Client handover + occupancy permit",
    ],
    milestoneNotes: [
      "All demolition materials cleared to approved site",
      "30 MPa concrete — approved by engineer D. Zilberman",
      null,
      "Includes tiling, plaster, paint",
      "Requires Tel Aviv municipality approval",
    ],
    taskNames: [
      "Demolish old flooring — entire apartment",
      "Demolish non-load-bearing walls",
      "Excavation and roof foundation reinforcement",
      "Pour foundations — column A1",
      "Pour foundations — column A2",
      "Lay underground plumbing",
      "Roof floor structure — steel framing",
      "Lay ceiling piles",
      "External cladding — east wall",
      "Structural engineer approval",
      "Install main electrical panel",
      "Lay electrical conduit — roof floor",
      "Interior plaster — all rooms",
      "Tile living room & dining area — 90x90 porcelain",
      "Bedroom flooring — hardwood",
      "Paint — entire apartment",
      "Kitchen installation",
      "Roof waterproofing test",
      "Final cleanup and handover",
    ],
    taskBlockedDesc:
      "Awaiting external engineer D. Zilberman — structural opinion on roof design change",
    weathers: [
      "Clear, 28°C",
      "Partly cloudy, 24°C",
      "Morning fog — cleared",
      "Clear, 31°C",
      "Hot and humid, 34°C",
      "Clear, 27°C",
    ],
    logNotes: [
      "Roof frame erection at columns A1-A4 complete. 12 workers on site.",
      "Ceiling beam welding — normal pace. Small weld defect at B3 — fixed on site.",
      "East wall pile laying complete. Drywall started in bedroom 1.",
      "Concrete pour for roof floor ceiling — 14 sqm. 30 MPa concrete.",
      "Minor delay due to occupied power station — work resumed after lunch.",
      "Municipal inspector visit — passed successfully. Work may continue.",
    ],
    qcTypes: [
      "Concrete pour test — roof foundations",
      "Steel column welding — block A",
      "Water pipe pressure test — 8 bar",
      "Water pipe pressure test — repeat",
      "Lobby entrance flooring inspection",
    ],
    qcNotes: [
      "30 MPa concrete — passed Israeli standard 1152",
      "All 8 columns — weld quality per ISO 3834",
      "Small leak in block B — plumber notified for repair",
      "Repaired and passed successfully",
      null,
    ],
    qcInspectors: [
      "Engineer D. Zilberman",
      "Engineer Gil Cohen",
      "Municipal Inspector",
      "Municipal Inspector",
      null,
    ],
    ncrDescriptions: [
      "Concrete thickness deviation — column A3: 18cm instead of 22cm",
      "Uneven lobby flooring — 3mm deviation",
      "Missing nails in roof beam — block C row 2",
    ],
    ncrAssignedTo: "Joseph Levy",
    ncrResolution: "Removed and re-tiled",
    riskDescriptions: [
      "Delay receiving SCHÜCO windows — manufactured in Germany",
      "Heavy rain — late winter",
      "Client changes finishing spec after work starts (stone instead of porcelain)",
      "Occupancy permit delay due to licensing authority backlog",
      "Shortage of tiling workers — peak season",
    ],
    riskMitigations: [
      "Early order 16 weeks ahead — supplier confirmation by email",
      "10-day buffer in schedule, plastic cover for materials",
      "Contract includes change clause — all changes in writing + signed change order",
      "Submit 60 days before completion, legal counsel assigned",
      "Subcontractor on standby committed to availability",
    ],
    crDescriptions: [
      "Add safe room on roof floor — required by municipality",
      "Change exterior wall finish — plaster to Jerusalem stone",
      "Expand roof terrace by 8 sqm",
    ],
    crRequestedBy: ["David Cohen", "David Cohen", "Sarah Cohen"],
    electricSubName: "ElectroPro Ltd.",
    electricSubContact: "Nissim Elazar",
    electricSubNotes: "Expert electrical contractor — 20 years experience",
    plumbSubName: "Mangal Plumbing T.A.",
    plumbSubContact: "Eran Mangal",
    electricContractDesc: "Full electrical work — roof floor + apartment renovation",
    plumbContractDesc: "Full plumbing work — water and sewage",
    electricPayRef: "Bank Transfer 2024-001",
    electricPayNotes: "First payment — 35% of contract",
    plumbPayRef: "Bank Transfer 2024-002",
    plumbPayNotes: "First payment — 50% of contract",
    inv1Desc: "Progress Invoice 1 — demolition, earthwork and roof foundations",
    inv1Notes: "Payment per milestones 1+2",
    inv1PayRef: "Bank Transfer BL-2024-0891",
    inv2Desc: "Progress Invoice 2 — roof floor framing + partial finishing",
    inv2Notes: "50% paid — balance by deadline",
    inv2PayRef: "Check No. 10045",
    inv3Desc: "Progress Invoice 3 — electrical, plumbing, tiling",
    wpNames: [
      "Demolition and clearance work",
      "Earthwork and foundations",
      "Roof floor framing",
      "Electrical work",
      "Plumbing work",
      "Finishing — tiling and cladding",
      "Finishing — plaster and paint",
      "Cleanup and handover",
    ],
    expenseDescriptions: [
      "30 MPa concrete bags — 40 bags, Kedem-Concrete",
      "Hydraulic crane refueling — 300L diesel",
      "Steel profiles — 8 tons, 12mm rebar",
      "PPR pipes + fittings — Beit Harutzim warehouse",
      "Team meals — concrete pour event",
      "Drill and ceiling rental — two weeks",
      "Electrical conduit, boxes + 2.5mm cables",
      "Materials transport — 2 truck trips",
      "Grista 90x90 porcelain tiles — 320 sqm",
      "Building permit amendment fee",
    ],
    foremanTimeDesc: "Supervision and framing work",
    craneTimeDesc: "Crane operation — beam placement",
    tilerTimeDesc: "Flooring surface preparation",
    electricianTimeDesc: "Electrical conduit laying",
    plumberTimeDesc: "Water pipe laying",
  },
  he: {
    projectName: "שיפוץ ובנייה על הגג — הרצל 42",
    projectDescription:
      "שיפוץ מלא של דירת 6 חדרים, 280 מ״ר + בנייה חדשה של 2 חדרים על הגג. כולל: עבודות שלד, טיח, חשמל, אינסטלציה, גבס, ריצוף וחיפוי.",
    projectAddress: "רחוב הרצל 42, תל אביב",
    clientName: "דוד כהן",
    clientContactName: "דוד כהן",
    clientAddress: "רחוב הרצל 42, תל אביב",
    clientCompanyNumber: "514123456",
    clientNotes: "לקוח VIP — שיפוץ מלא + בנייה על הגג",
    leadName: "דוד כהן",
    leadAddress: "רחוב הרצל 42, תל אביב",
    leadCity: "תל אביב",
    leadNotes:
      "לקוח מומלץ מישראל כהן. מעוניין בשיפוץ מלא של דירה 6 חדרים + בנייה על הגג. יש לו תקציב ומוכן להתקדם מהר.",
    communicationContent:
      "פגישה ראשונה עם הלקוח — הוצג הפרויקט, נדון תקציב והיקף עבודה. הלקוח אישר את הכיוון הכללי.",
    foremanName: "יוסף לוי",
    foremanTrade: "מנהל עבודה",
    craneName: "מוחמד עבאס",
    craneTrade: "מנופאי",
    tilerName: "שלמה כהן",
    tilerTrade: "רצף",
    electricianName: "ג׳מאל חסן",
    electricianTrade: "חשמלאי",
    plumberName: "רוני פרץ",
    plumberTrade: "אינסטלטור",
    milestoneNames: [
      "השלמת עבודות הריסה ופינוי",
      "יציקת יסודות לבנייה על הגג",
      "השלמת שלד קומת גג",
      "סיום עבודות גמר פנים",
      "מסירה ללקוח + טופס 4",
    ],
    milestoneNotes: [
      "כל חומרי ההריסה פונו לאתר מאושר",
      "בטון 30 MPa — אושר ע״י מהנדס ד׳ זילברמן",
      null,
      "כולל ריצוף, טיח, צבע",
      "נדרש אישור עיריית תל אביב",
    ],
    taskNames: [
      "פירוק ריצוף ישן — כל הדירה",
      "הריסת קירות לא נושאים",
      "חפירה וחיזוק יסוד גג",
      "יציקת יסודות — עמוד A1",
      "יציקת יסודות — עמוד A2",
      "הנחת אינסטלציה תת-קרקעית",
      "קירוי קומת גג — שלד פלדה",
      "הנחת כלונסאות תקרה",
      "חיפוי חיצוני — קיר מזרח",
      "אישור מהנדס קונסטרוקציה",
      "התקנת לוח חשמל ראשי",
      "הנחת צנרת חשמל — קומת גג",
      "טיח פנים — כל חדרי הדירה",
      "ריצוף סלון ופינת אוכל — פורצלן 90x90",
      "ריצוף חדרי שינה — פרקט",
      "צביעה — כל הדירה",
      "התקנת מטבח",
      "בדיקת אטימות גג",
      "ניקיון סופי ומסירה",
    ],
    taskBlockedDesc:
      "ממתין לאישור מהנדס חיצוני ד׳ זילברמן — חוות דעת על שינוי תכנון גג",
    weathers: [
      "בהיר, 28°C",
      "מעונן חלקית, 24°C",
      "ערפל בוקר — ניקה",
      "בהיר, 31°C",
      "חם ולח, 34°C",
      "בהיר, 27°C",
    ],
    logNotes: [
      "הניפוי של שלד הגג בעמוד A1-A4 הסתיים. 12 פועלים באתר.",
      "ריתוך קורות תקרה — קצב עבודה תקין. פגם קטן בריתוך B3 — תוקן במקום.",
      "הנחת כלונסאות בקיר מזרח הושלמה. הותחלה עבודת גבס בחדר שינה 1.",
      "יציקת בטון לתקרת קומת הגג — 14 מ׳ רבועים. בטון 30 MPa.",
      "עיכוב קל עקב תחנת מכוח תפוסה — עבודה חזרה לאחר הפסקת צהריים.",
      "בדיקת מפקח עיריה — עברה בהצלחה. ניתן להמשיך.",
    ],
    qcTypes: [
      "בדיקת יציקת בטון — יסודות גג",
      "ריתוך עמודי פלדה — גוש A",
      "מבחן לחץ צנרת מים — 8 בר",
      "מבחן לחץ צנרת מים — חזרה",
      "בדיקת ריצוף לובי כניסה",
    ],
    qcNotes: [
      "בטון 30 MPa — עבר תקן ישראלי 1152",
      "כל 8 עמודים — ריתוך תקין לפי ISO 3834",
      "דליפה קטנה בגוש B — פניה לקבלן אינסטלציה לתיקון",
      "תוקן ועבר בהצלחה",
      null,
    ],
    qcInspectors: [
      "מהנדס ד׳ זילברמן",
      "מהנדס גיל כהן",
      "מפקח עיריה",
      "מפקח עיריה",
      null,
    ],
    ncrDescriptions: [
      "חריגה בעובי בטון — עמוד A3: 18 ס״מ במקום 22 ס״מ",
      "ריצוף לא ישר בלובי — חריגה של 3 מ״מ",
      "חוסר מסמרים בקורת גג — גוש C שורה 2",
    ],
    ncrAssignedTo: "יוסף לוי",
    ncrResolution: "הוסר ורוצף מחדש",
    riskDescriptions: [
      "עיכוב בקבלת חלונות SCHÜCO — ייצור בגרמניה",
      "גשמים חזקים — חורף מאוחר",
      "שינוי דרישות לקוח לאחר תחילת גמר (טייל במקום פורצלן בסלון)",
      "עיכוב טופס 4 עקב פקק ברשות הרישוי",
      "מחסור בעובדי ריצוף — עונת שיא",
    ],
    riskMitigations: [
      "הזמנה מוקדמת ב-16 שבועות — אישור מהספק בדוא״ל",
      "ריפוד 10 ימים בלוח זמנים, כיסוי פלסטיק לחומרים",
      "חוזה עם סעיף שינויים — כל שינוי בכתב + הזמנת שינוי חתומה",
      "פנייה מוקדמת ל-60 יום לפני סיום, עורך דין מלווה",
      "קבלן משנה ממתין חתם על זמינות",
    ],
    crDescriptions: [
      "הוספת ממ״ד בקומת גג — נדרש ע״י עיריה",
      "שינוי גמר קיר חיצוני — מטיח לאבן ירושלמית",
      "הרחבת מרפסת גג ב-8 מ״ר",
    ],
    crRequestedBy: ["דוד כהן", "דוד כהן", "שרה כהן"],
    electricSubName: "אלקטרו-פרו בע״מ",
    electricSubContact: "ניסים אלעזר",
    electricSubNotes: "קבלן חשמל מומחה — 20 שנות ניסיון",
    plumbSubName: "מנגל-אינסטל ת.א.",
    plumbSubContact: "ערן מנגל",
    electricContractDesc: "עבודות חשמל מלאות — קומת גג + שיפוץ דירה",
    plumbContractDesc: "עבודות אינסטלציה מלאות — מים וביוב",
    electricPayRef: "העברה בנקאית 2024-001",
    electricPayNotes: "תשלום ראשון — 35% מהחוזה",
    plumbPayRef: "העברה בנקאית 2024-002",
    plumbPayNotes: "תשלום ראשון — 50% מהחוזה",
    inv1Desc: "חשבון מצב 1 — עבודות הריסה, עפר ויסודות גג",
    inv1Notes: "תשלום בהתאם לאבן דרך 1+2",
    inv1PayRef: "העברה BL-2024-0891",
    inv2Desc: "חשבון מצב 2 — שלד קומת גג + גמר חלקי",
    inv2Notes: "שולם 50% — יתרה עד מועד הדדליין",
    inv2PayRef: "שיק מס׳ 10045",
    inv3Desc: "חשבון מצב 3 — חשמל, אינסטלציה, ריצוף",
    wpNames: [
      "עבודות הריסה ופינוי",
      "עבודות עפר ויסודות",
      "שלד קומת גג",
      "עבודות חשמל",
      "עבודות אינסטלציה",
      "עבודות גמר — ריצוף וחיפוי",
      "עבודות גמר — טיח וצבע",
      "ניקיון ומסירה",
    ],
    expenseDescriptions: [
      "שקים בטון 30 MPa — 40 שקים, חברת קדם-בטון",
      "תדלוק מנוף הידראולי — 300 ליטר סולר",
      "פרופילי פלדה — 8 טון, מוט הברזל 12 מ״מ",
      "צינורות PPR + אביזרים — מחסן בית חרוצים",
      "ארוחות צוות — אירוע יציקה",
      "השכרת קידוח ותקרה — שבועיים",
      "צינורות חשמל, קופסאות + כבלים 2.5 מ״מ",
      "הובלת חומרים מאתר — 2 נסיעות שאגיל",
      "אריחי פורצלן גריסטה 90x90 — 320 מ״ר",
      "אגרת היתר בנייה תוספת",
    ],
    foremanTimeDesc: "פיקוח ועבודת שלד",
    craneTimeDesc: "הפעלת מנוף — הנחת קורות",
    tilerTimeDesc: "הכנת משטח לריצוף",
    electricianTimeDesc: "הנחת צינורות חשמל",
    plumberTimeDesc: "הנחת צנרת מים",
  },
} as const;

export async function seedDemoProject(
  companyId: string,
  adminUserId: string,
  locale: "en" | "he"
): Promise<void> {
  const t = DICT[locale];
  const ts = Date.now();

  // Worker users (needed for Task.assignedToId)
  const [foremanUser, craneUser, tilerUser, electricianUser, plumberUser] =
    await Promise.all([
      db.user.create({
        data: {
          companyId,
          name: t.foremanName,
          email: `demo-foreman-${ts}@buildpro-demo.internal`,
          passwordHash: "$2b$10$demo_placeholder_not_real_hash_x",
          role: "PROJECT_MANAGER",
        },
      }),
      db.user.create({
        data: {
          companyId,
          name: t.craneName,
          email: `demo-crane-${ts}@buildpro-demo.internal`,
          passwordHash: "$2b$10$demo_placeholder_not_real_hash_x",
          role: "FIELD_WORKER",
        },
      }),
      db.user.create({
        data: {
          companyId,
          name: t.tilerName,
          email: `demo-tiler-${ts}@buildpro-demo.internal`,
          passwordHash: "$2b$10$demo_placeholder_not_real_hash_x",
          role: "FIELD_WORKER",
        },
      }),
      db.user.create({
        data: {
          companyId,
          name: t.electricianName,
          email: `demo-elec-${ts}@buildpro-demo.internal`,
          passwordHash: "$2b$10$demo_placeholder_not_real_hash_x",
          role: "FIELD_WORKER",
        },
      }),
      db.user.create({
        data: {
          companyId,
          name: t.plumberName,
          email: `demo-plumb-${ts}@buildpro-demo.internal`,
          passwordHash: "$2b$10$demo_placeholder_not_real_hash_x",
          role: "FIELD_WORKER",
        },
      }),
    ]);

  // Employees
  const [foreman, crane, tiler, electrician, plumber] = await Promise.all([
    db.employee.create({
      data: {
        companyId,
        name: t.foremanName,
        trade: t.foremanTrade,
        phone: "050-9876543",
        idNumber: `demo-001-${ts}`,
        hourlyRate: 120,
        startDate: new Date("2020-03-01"),
      },
    }),
    db.employee.create({
      data: {
        companyId,
        name: t.craneName,
        trade: t.craneTrade,
        phone: "052-1122334",
        idNumber: `demo-002-${ts}`,
        hourlyRate: 150,
        startDate: new Date("2019-07-15"),
      },
    }),
    db.employee.create({
      data: {
        companyId,
        name: t.tilerName,
        trade: t.tilerTrade,
        phone: "054-5566778",
        idNumber: `demo-003-${ts}`,
        hourlyRate: 90,
        startDate: new Date("2022-01-10"),
      },
    }),
    db.employee.create({
      data: {
        companyId,
        name: t.electricianName,
        trade: t.electricianTrade,
        phone: "053-9900112",
        idNumber: `demo-004-${ts}`,
        hourlyRate: 110,
        startDate: new Date("2021-05-20"),
      },
    }),
    db.employee.create({
      data: {
        companyId,
        name: t.plumberName,
        trade: t.plumberTrade,
        phone: "050-3344556",
        idNumber: `demo-005-${ts}`,
        hourlyRate: 100,
        startDate: new Date("2023-03-01"),
      },
    }),
  ]);

  // Lead
  const lead = await db.lead.create({
    data: {
      companyId,
      name: t.leadName,
      phone: "054-7654321",
      phone2: "03-6543210",
      email: "david.cohen@example.co.il",
      propertyAddress: t.leadAddress,
      city: t.leadCity,
      estimatedSize: 280,
      constructionTypes: ["renovation", "residential"],
      source: "REFERRAL",
      status: "MEETING_SCHEDULED",
      urgency: "HIGH",
      budget: 1_200_000,
      notes: t.leadNotes,
      assignedToId: adminUserId,
    },
  });

  await db.communicationLog.create({
    data: {
      companyId,
      type: "MEETING",
      content: t.communicationContent,
      leadId: lead.id,
      authorId: adminUserId,
    },
  });

  // Convert lead → client
  const client = await db.client.create({
    data: {
      companyId,
      name: t.clientName,
      contactName: t.clientContactName,
      phone: "054-7654321",
      phone2: "03-6543210",
      email: "david.cohen@example.co.il",
      address: t.clientAddress,
      companyNumber: t.clientCompanyNumber,
      notes: t.clientNotes,
      latitude: 32.0853,
      longitude: 34.7818,
    },
  });

  await db.lead.update({
    where: { id: lead.id },
    data: { status: "CONVERTED", convertedAt: new Date(), convertedToId: client.id },
  });

  // Project
  const project = await db.project.create({
    data: {
      companyId,
      name: t.projectName,
      description: t.projectDescription,
      address: t.projectAddress,
      clientId: client.id,
      managerId: adminUserId,
      status: "ACTIVE",
      startDate: d(-60),
      endDate: d(120),
      contractValue: 1_380_000,
      progressPercent: 28,
      latitude: 32.0853,
      longitude: 34.7818,
      settings: {
        create: {
          qcEnabled: true,
          risksEnabled: true,
          crEnabled: true,
          milestonesEnabled: true,
          wbsEnabled: true,
          procurementEnabled: true,
          ganttEnabled: true,
        },
      },
    },
  });

  await db.projectMember.create({
    data: { projectId: project.id, userId: adminUserId, role: "MANAGER" },
  });

  // Milestones
  const milestones = await Promise.all([
    db.milestone.create({ data: { projectId: project.id, name: t.milestoneNames[0], date: d(-50), weight: 2, completed: true,  completedAt: d(-48), order: 0, notes: t.milestoneNotes[0] } }),
    db.milestone.create({ data: { projectId: project.id, name: t.milestoneNames[1], date: d(-20), weight: 3, completed: true,  completedAt: d(-18), order: 1, notes: t.milestoneNotes[1] } }),
    db.milestone.create({ data: { projectId: project.id, name: t.milestoneNames[2], date: d(15),  weight: 3, completed: false, completedAt: null,   order: 2, notes: t.milestoneNotes[2] } }),
    db.milestone.create({ data: { projectId: project.id, name: t.milestoneNames[3], date: d(70),  weight: 3, completed: false, completedAt: null,   order: 3, notes: t.milestoneNotes[3] } }),
    db.milestone.create({ data: { projectId: project.id, name: t.milestoneNames[4], date: d(120), weight: 5, completed: false, completedAt: null,   order: 4, notes: t.milestoneNotes[4] } }),
  ]);

  // Tasks
  const tn = t.taskNames;
  await db.task.createMany({
    data: [
      // Completed
      { companyId, projectId: project.id, milestoneId: milestones[0].id, name: tn[0],  priority: "HIGH",   status: "DONE",        assignedToId: foremanUser.id,     completedAt: d(-52), dueDate: d(-50) },
      { companyId, projectId: project.id, milestoneId: milestones[0].id, name: tn[1],  priority: "HIGH",   status: "DONE",        assignedToId: foremanUser.id,     completedAt: d(-50), dueDate: d(-48) },
      { companyId, projectId: project.id, milestoneId: milestones[1].id, name: tn[2],  priority: "URGENT", status: "DONE",        assignedToId: craneUser.id,       completedAt: d(-22), dueDate: d(-20) },
      { companyId, projectId: project.id, milestoneId: milestones[1].id, name: tn[3],  priority: "HIGH",   status: "DONE",        assignedToId: foremanUser.id,     completedAt: d(-19), dueDate: d(-18) },
      { companyId, projectId: project.id, milestoneId: milestones[1].id, name: tn[4],  priority: "HIGH",   status: "DONE",        assignedToId: foremanUser.id,     completedAt: d(-18), dueDate: d(-17) },
      { companyId, projectId: project.id, milestoneId: milestones[1].id, name: tn[5],  priority: "MEDIUM", status: "DONE",        assignedToId: plumberUser.id,     completedAt: d(-15), dueDate: d(-14) },
      // Active
      { companyId, projectId: project.id, milestoneId: milestones[2].id, name: tn[6],  priority: "HIGH",   status: "IN_PROGRESS", assignedToId: craneUser.id,       dueDate: d(10) },
      { companyId, projectId: project.id, milestoneId: milestones[2].id, name: tn[7],  priority: "HIGH",   status: "IN_PROGRESS", assignedToId: foremanUser.id,     dueDate: d(14) },
      { companyId, projectId: project.id,                                 name: tn[8],  priority: "MEDIUM", status: "IN_PROGRESS", assignedToId: foremanUser.id },
      // Blocked
      { companyId, projectId: project.id,                                 name: tn[9],  priority: "URGENT", status: "BLOCKED",     description: t.taskBlockedDesc, dueDate: d(5) },
      // Upcoming
      { companyId, projectId: project.id, milestoneId: milestones[3].id, name: tn[10], priority: "HIGH",   status: "TODO",        assignedToId: electricianUser.id, dueDate: d(25) },
      { companyId, projectId: project.id, milestoneId: milestones[3].id, name: tn[11], priority: "HIGH",   status: "TODO",        assignedToId: electricianUser.id, dueDate: d(30) },
      { companyId, projectId: project.id, milestoneId: milestones[3].id, name: tn[12], priority: "MEDIUM", status: "TODO",        dueDate: d(40) },
      { companyId, projectId: project.id, milestoneId: milestones[3].id, name: tn[13], priority: "MEDIUM", status: "TODO",        assignedToId: tilerUser.id,       dueDate: d(55) },
      { companyId, projectId: project.id, milestoneId: milestones[3].id, name: tn[14], priority: "LOW",    status: "TODO",        assignedToId: tilerUser.id,       dueDate: d(60) },
      { companyId, projectId: project.id, milestoneId: milestones[3].id, name: tn[15], priority: "LOW",    status: "TODO",        dueDate: d(70) },
      { companyId, projectId: project.id, milestoneId: milestones[3].id, name: tn[16], priority: "MEDIUM", status: "TODO",        dueDate: d(75) },
      { companyId, projectId: project.id, milestoneId: milestones[4].id, name: tn[17], priority: "HIGH",   status: "TODO",        dueDate: d(100) },
      { companyId, projectId: project.id, milestoneId: milestones[4].id, name: tn[18], priority: "MEDIUM", status: "TODO",        dueDate: d(118) },
    ],
  });

  // Daily logs
  const logDates = [-5, -4, -3, -2, -1, 0].map((o) => d(o));
  for (let i = 0; i < logDates.length; i++) {
    await db.dailyLog.create({
      data: {
        companyId,
        projectId: project.id,
        supervisorId: adminUserId,
        date: logDates[i],
        weatherConditions: t.weathers[i],
        visitors: i % 3 === 0 ? (locale === "he" ? "מפקח עיריה, מהנדס לקוח" : "Municipal inspector, client engineer") : null,
        safetyIncidents: null,
        notes: t.logNotes[i],
      },
    });
  }

  // Time entries
  const empHourlyRates: Record<string, number> = {
    [foreman.id]: 120,
    [crane.id]: 150,
    [tiler.id]: 90,
    [electrician.id]: 110,
    [plumber.id]: 100,
  };
  const empDescriptions: Record<string, string> = {
    [foreman.id]: t.foremanTimeDesc,
    [crane.id]: t.craneTimeDesc,
    [tiler.id]: t.tilerTimeDesc,
    [electrician.id]: t.electricianTimeDesc,
    [plumber.id]: t.plumberTimeDesc,
  };
  const timeEntryData: Array<{ employeeId: string; date: Date; hours: number; hourlyRate: number; description: string }> = [];
  for (let offset = -30; offset <= -1; offset++) {
    if (offset % 7 === 0 || offset % 7 === 6) continue;
    const dayEmployees = [foreman, crane, tiler, electrician, plumber].filter(
      (_, i) => i % 3 !== Math.abs(offset) % 3
    );
    for (const emp of dayEmployees) {
      const hours = 8 + (Math.abs(offset) % 3);
      timeEntryData.push({
        employeeId: emp.id,
        date: d(offset),
        hours,
        hourlyRate: empHourlyRates[emp.id],
        description: empDescriptions[emp.id],
      });
    }
  }
  await db.timeEntry.createMany({
    data: timeEntryData.map((te) => ({
      projectId: project.id,
      employeeId: te.employeeId,
      date: te.date,
      hours: te.hours,
      hourlyRate: te.hourlyRate,
      totalCost: te.hours * te.hourlyRate,
      description: te.description,
      approved: true,
      approvedById: adminUserId,
      approvedAt: new Date(),
    })),
  });

  // Expenses
  const ed = t.expenseDescriptions;
  await db.expense.createMany({
    data: [
      { projectId: project.id, employeeId: foreman.id,      date: d(-28), amount: 4_800,  category: "MATERIALS",  description: ed[0] },
      { projectId: project.id, employeeId: crane.id,        date: d(-25), amount: 1_200,  category: "FUEL",       description: ed[1] },
      { projectId: project.id, employeeId: foreman.id,      date: d(-22), amount: 12_500, category: "MATERIALS",  description: ed[2] },
      { projectId: project.id, employeeId: plumber.id,      date: d(-18), amount: 3_200,  category: "MATERIALS",  description: ed[3] },
      { projectId: project.id,                               date: d(-15), amount: 650,    category: "MEALS",      description: ed[4] },
      { projectId: project.id, employeeId: foreman.id,      date: d(-12), amount: 2_800,  category: "TOOLS",      description: ed[5] },
      { projectId: project.id, employeeId: electrician.id,  date: d(-10), amount: 5_400,  category: "MATERIALS",  description: ed[6] },
      { projectId: project.id,                               date: d(-8),  amount: 1_800,  category: "TRANSPORT",  description: ed[7] },
      { projectId: project.id, employeeId: tiler.id,        date: d(-5),  amount: 18_200, category: "MATERIALS",  description: ed[8] },
      { projectId: project.id,                               date: d(-3),  amount: 450,    category: "OTHER",      description: ed[9] },
    ],
  });

  // Quality checks & NCRs
  await db.qualityCheck.createMany({
    data: [
      { projectId: project.id, type: t.qcTypes[0], result: "PASS",    inspector: t.qcInspectors[0], notes: t.qcNotes[0], date: d(-18) },
      { projectId: project.id, type: t.qcTypes[1], result: "PASS",    inspector: t.qcInspectors[1], notes: t.qcNotes[1], date: d(-12) },
      { projectId: project.id, type: t.qcTypes[2], result: "FAIL",    inspector: t.qcInspectors[2], notes: t.qcNotes[2], date: d(-7)  },
      { projectId: project.id, type: t.qcTypes[3], result: "PASS",    inspector: t.qcInspectors[3], notes: t.qcNotes[3], date: d(-4)  },
      { projectId: project.id, type: t.qcTypes[4], result: "PENDING", inspector: null,               notes: null,         date: d(0)   },
    ],
  });

  await db.nCR.createMany({
    data: [
      { projectId: project.id, description: t.ncrDescriptions[0], severity: "HIGH",   status: "IN_PROGRESS", assignedTo: t.ncrAssignedTo,  date: d(-15) },
      { projectId: project.id, description: t.ncrDescriptions[1], severity: "LOW",    status: "CLOSED",      resolution: t.ncrResolution,  closedAt: d(-5), date: d(-20) },
      { projectId: project.id, description: t.ncrDescriptions[2], severity: "MEDIUM", status: "OPEN",        date: d(-3) },
    ],
  });

  // Risks
  await db.risk.createMany({
    data: [
      { projectId: project.id, description: t.riskDescriptions[0], probability: 4, impact: 4, mitigation: t.riskMitigations[0], status: "OPEN"      },
      { projectId: project.id, description: t.riskDescriptions[1], probability: 3, impact: 2, mitigation: t.riskMitigations[1], status: "MITIGATED" },
      { projectId: project.id, description: t.riskDescriptions[2], probability: 2, impact: 3, mitigation: t.riskMitigations[2], status: "OPEN"      },
      { projectId: project.id, description: t.riskDescriptions[3], probability: 3, impact: 5, mitigation: t.riskMitigations[3], status: "OPEN"      },
      { projectId: project.id, description: t.riskDescriptions[4], probability: 3, impact: 3, mitigation: t.riskMitigations[4], status: "CLOSED"    },
    ],
  });

  // Change requests
  await db.changeRequest.createMany({
    data: [
      { projectId: project.id, description: t.crDescriptions[0], requestedBy: t.crRequestedBy[0], costImpact: 48_000, scheduleImpact: 14, status: "APPROVED", date: d(-40), approvedAt: d(-35) },
      { projectId: project.id, description: t.crDescriptions[1], requestedBy: t.crRequestedBy[1], costImpact: 38_000, scheduleImpact: 10, status: "PENDING",  date: d(-10) },
      { projectId: project.id, description: t.crDescriptions[2], requestedBy: t.crRequestedBy[2], costImpact: 22_000, scheduleImpact: 7,  status: "REJECTED", date: d(-30) },
    ],
  });

  // Suppliers & contracts
  const electricSub = await db.supplier.create({
    data: {
      companyId,
      name: t.electricSubName,
      contactName: t.electricSubContact,
      phone: "03-5551234",
      email: "contact@electropro-demo.internal",
      type: "SUBCONTRACTOR",
      rating: 5,
      notes: t.electricSubNotes,
      active: true,
    },
  });

  const plumbSub = await db.supplier.create({
    data: {
      companyId,
      name: t.plumbSubName,
      contactName: t.plumbSubContact,
      phone: "052-9988776",
      type: "SUBCONTRACTOR",
      rating: 4,
      active: true,
    },
  });

  const electricContract = await db.contract.create({
    data: {
      companyId,
      projectId: project.id,
      supplierId: electricSub.id,
      description: t.electricContractDesc,
      value: 145_000,
      startDate: d(-10),
      endDate: d(80),
      status: "ACTIVE",
      retentionPercent: 5,
      paidAmount: 50_000,
    },
  });

  await db.supplierPayment.create({
    data: {
      contractId: electricContract.id,
      date: d(-15),
      amount: 50_000,
      reference: t.electricPayRef,
      notes: t.electricPayNotes,
    },
  });

  const plumbContract = await db.contract.create({
    data: {
      companyId,
      projectId: project.id,
      supplierId: plumbSub.id,
      description: t.plumbContractDesc,
      value: 68_000,
      startDate: d(-20),
      endDate: d(60),
      status: "ACTIVE",
      retentionPercent: 5,
      paidAmount: 34_000,
    },
  });

  await db.supplierPayment.create({
    data: {
      contractId: plumbContract.id,
      date: d(-10),
      amount: 34_000,
      reference: t.plumbPayRef,
      notes: t.plumbPayNotes,
    },
  });

  // Invoices & payments
  const inv1 = await db.invoice.create({
    data: {
      companyId,
      clientId: client.id,
      projectId: project.id,
      invoiceNumber: `DEMO-INV-001-${ts}`,
      description: t.inv1Desc,
      date: d(-45),
      dueDate: d(-15),
      status: "PAID",
      amount: 350_000,
      taxPercent: 17,
      taxAmount: 59_500,
      total: 409_500,
      paidAmount: 409_500,
      notes: t.inv1Notes,
    },
  });

  await db.payment.create({
    data: { invoiceId: inv1.id, date: d(-14), amount: 409_500, method: "BANK_TRANSFER", reference: t.inv1PayRef },
  });

  const inv2 = await db.invoice.create({
    data: {
      companyId,
      clientId: client.id,
      projectId: project.id,
      invoiceNumber: `DEMO-INV-002-${ts}`,
      description: t.inv2Desc,
      date: d(-10),
      dueDate: d(20),
      status: "PARTIALLY_PAID",
      amount: 280_000,
      taxPercent: 17,
      taxAmount: 47_600,
      total: 327_600,
      paidAmount: 150_000,
      notes: t.inv2Notes,
    },
  });

  await db.payment.create({
    data: { invoiceId: inv2.id, date: d(-5), amount: 150_000, method: "CHECK", reference: t.inv2PayRef },
  });

  const inv3 = await db.invoice.create({
    data: {
      companyId,
      clientId: client.id,
      projectId: project.id,
      invoiceNumber: `DEMO-INV-003-${ts}`,
      description: t.inv3Desc,
      date: d(0),
      dueDate: d(30),
      status: "SENT",
      amount: 200_000,
      taxPercent: 17,
      taxAmount: 34_000,
      total: 234_000,
      paidAmount: 0,
      notes: null,
    },
  });

  // Work packages
  const wp = t.wpNames;
  await db.workPackage.createMany({
    data: [
      { projectId: project.id, name: wp[0], plannedCost: 85_000,  actualCost: 88_200,  completionPercent: 100, startDate: d(-60), endDate: d(-45), order: 0 },
      { projectId: project.id, name: wp[1], plannedCost: 120_000, actualCost: 118_500, completionPercent: 100, startDate: d(-50), endDate: d(-20), order: 1 },
      { projectId: project.id, name: wp[2], plannedCost: 220_000, actualCost: 145_000, completionPercent: 65,  startDate: d(-20), endDate: d(20),  order: 2 },
      { projectId: project.id, name: wp[3], plannedCost: 145_000, actualCost: 50_000,  completionPercent: 30,  startDate: d(-10), endDate: d(80),  order: 3 },
      { projectId: project.id, name: wp[4], plannedCost: 68_000,  actualCost: 34_000,  completionPercent: 50,  startDate: d(-20), endDate: d(60),  order: 4 },
      { projectId: project.id, name: wp[5], plannedCost: 180_000, actualCost: 18_200,  completionPercent: 10,  startDate: d(20),  endDate: d(80),  order: 5 },
      { projectId: project.id, name: wp[6], plannedCost: 95_000,  actualCost: 0,        completionPercent: 0,   startDate: d(40),  endDate: d(90),  order: 6 },
      { projectId: project.id, name: wp[7], plannedCost: 15_000,  actualCost: 0,        completionPercent: 0,   startDate: d(110), endDate: d(120), order: 7 },
    ],
  });

  // Activity logs
  await db.activityLog.createMany({
    data: [
      { companyId, userId: adminUserId, action: "PROJECT_CREATED",     entityType: "PROJECT", entityId: project.id, details: JSON.stringify({ description: `${t.projectName}` }) },
      { companyId, userId: adminUserId, action: "INVOICE_CREATED",     entityType: "INVOICE", entityId: inv1.id,    details: JSON.stringify({ description: `${t.inv1Desc} — ₪409,500` }) },
      { companyId, userId: adminUserId, action: "PAYMENT_RECEIVED",    entityType: "INVOICE", entityId: inv1.id,    details: JSON.stringify({ description: `₪409,500 — DEMO-INV-001` }) },
      { companyId, userId: adminUserId, action: "INVOICE_CREATED",     entityType: "INVOICE", entityId: inv2.id,    details: JSON.stringify({ description: `${t.inv2Desc} — ₪327,600` }) },
      { companyId, userId: adminUserId, action: "INVOICE_CREATED",     entityType: "INVOICE", entityId: inv3.id,    details: JSON.stringify({ description: `${t.inv3Desc} — ₪234,000` }) },
      { companyId, userId: adminUserId, action: "TASK_STATUS_CHANGED", entityType: "TASK",    details: JSON.stringify({ description: `${t.taskNames[3]}` }) },
      { companyId, userId: adminUserId, action: "RISK_CREATED",        entityType: "RISK",    details: JSON.stringify({ description: t.riskDescriptions[0] }) },
    ],
  });
}
