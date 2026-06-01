"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import {
  HelpCircle,
  Rocket,
  UserPlus,
  Users,
  FolderKanban,
  TrendingUp,
  FileText,
  Receipt,
  HardHat,
  Package,
  ShoppingBag,
  Wallet,
  MapPin,
  LayoutDashboard,
  Settings,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Guide content (he + en) ───────────────────────────────────────────────────
// Plain data so the whole guide is editable in one place and fully bilingual.

type Step = { icon: React.ElementType; title: string; body: string[] };
type Guide = {
  dir: "rtl" | "ltr";
  triggerLabel: string;
  title: string;
  subtitle: string;
  intro: string;
  steps: Step[];
  tipsTitle: string;
  tips: string[];
  closing: string;
};

const GUIDES: Record<"he" | "en", Guide> = {
  he: {
    dir: "rtl",
    triggerLabel: "עזרה",
    title: "מדריך למשתמש — מ-0 ל-100",
    subtitle: "כל מה שצריך לדעת כדי להתחיל לעבוד עם המערכת",
    intro:
      "ברוכים הבאים ל-BuildPro — מערכת לניהול חברת בנייה: לקוחות, פרויקטים, הצעות מחיר, חשבוניות, שטח, צוות ופיננסים, הכל במקום אחד. המדריך הזה לוקח אותך שלב-אחר-שלב מההתחברות הראשונה ועד ניהול שוטף.",
    steps: [
      {
        icon: Rocket,
        title: "1. התחברות ראשונה והקמת החברה",
        body: [
          "התחבר באמצעות חשבון Google או עם המייל והסיסמה שקיבלת.",
          "בכניסה הראשונה תתבקש להזין את שם חברת הבנייה שלך — זהו שלב חד-פעמי שמקים עבורך סביבה נקייה ופרטית.",
          "לאחר ההקמה, המערכת שלך ריקה לחלוטין — אף לקוח, פרויקט או נתון מחברה אחרת לא מופיע אצלך. הכל מבודד ומאובטח.",
        ],
      },
      {
        icon: Globe,
        title: "2. שפה וכיוון",
        body: [
          "ניתן להחליף בין עברית לאנגלית בכל רגע דרך מתג השפה (הדגל) בראש המסך.",
          "המערכת מתאימה את כיוון התצוגה אוטומטית (ימין-לשמאל בעברית).",
        ],
      },
      {
        icon: Users,
        title: "3. הוספת צוות העובדים",
        body: [
          "כמנהל, היכנס ללשונית \"צוות\" כדי להזמין עובדים.",
          "לחץ \"הזמנת עובד\", הזן שם, כתובת מייל ותפקיד (מנהל מערכת, מנהל משרד, מנהל פרויקטים, או איש שטח).",
          "העובד יתחבר עם חשבון Google של אותה כתובת מייל ויצורף אוטומטית לחברה שלך עם ההרשאות שהגדרת.",
        ],
      },
      {
        icon: TrendingUp,
        title: "4. ניהול לידים (לקוחות פוטנציאליים)",
        body: [
          "בלשונית \"לידים\" נהל פניות נכנסות: שם, טלפון, כתובת הנכס, מקור הפנייה ורמת דחיפות.",
          "עקוב אחר סטטוס הליד (חדש, יצירת קשר, פגישה, הצעת מחיר, מו\"מ) עד הסגירה.",
          "כשליד הופך ללקוח — המר אותו ללקוח בלחיצה אחת, והפרטים עוברים אוטומטית.",
        ],
      },
      {
        icon: UserPlus,
        title: "5. לקוחות",
        body: [
          "בלשונית \"לקוחות\" הוסף לקוח חדש עם פרטי קשר וכתובת (יש השלמה אוטומטית של כתובות).",
          "בכרטיס הלקוח תראה את כל הפרויקטים, הצעות המחיר, החשבוניות והפעילות שלו במקום אחד.",
          "אפשר לפתוח פרויקט חדש ישירות מתוך כרטיס הלקוח — הוא ייפתח באותו מסך.",
        ],
      },
      {
        icon: FolderKanban,
        title: "6. פרויקטים",
        body: [
          "צור פרויקט, שייך אותו ללקוח, והגדר כתובת, תאריכים וערך חוזה.",
          "בכל פרויקט יש לשוניות לניהול מלא: משימות, פיננסים, שטח, צוות, אבני דרך, אבטחת איכות, סיכונים, בקשות שינוי, רכש ועוד.",
          "מעקב התקדמות, מסמכים וקבצים — הכל מרוכז בכרטיס הפרויקט.",
        ],
      },
      {
        icon: FileText,
        title: "7. הצעות מחיר וחשבוניות",
        body: [
          "בנה הצעת מחיר מפורטת לפי קטגוריות ופריטים, כולל חישוב מע\"מ ורווחיות.",
          "הפק חשבוניות ללקוחות ועקוב אחר תשלומים וחובות פתוחים.",
          "הקטלוג (מחירון) מאפשר לשמור פריטים, יחידות מידה ומחירים לשימוש חוזר בהצעות.",
        ],
      },
      {
        icon: HardHat,
        title: "8. שטח ומשאבים",
        body: [
          "דיווחי שטח: שעות עבודה, הוצאות ויומני עבודה יומיים לכל פרויקט.",
          "ניהול עובדים (כוח אדם), ציוד וכלים — כולל הקצאתם לפרויקטים.",
          "משימות: צור ושייך משימות לעובדים, עם עדיפויות ותאריכי יעד.",
        ],
      },
      {
        icon: Wallet,
        title: "9. פיננסים ורכש",
        body: [
          "מסך הפיננסים מרכז הכנסות, עלויות ורווחיות עם דוח רווח/הפסד לכל פרויקט.",
          "נהל ספקים וקבלני משנה, חוזים ותשלומים.",
          "הקטלוג מאפשר ייבוא וייצוא פריטים בקובץ CSV (כולל תיאורים).",
        ],
      },
      {
        icon: LayoutDashboard,
        title: "10. לוח הבקרה (Dashboard)",
        body: [
          "מסך הבית מציג נתונים חשובים: לידים, פרויקטים פעילים, משימות, הכנסות ועוד.",
          "אפשר להתאים אישית את הווידג'טים — לגרור, לשנות גודל, להוסיף ולהסיר (בלחיצה על \"עריכה\").",
          "ווידג'ט המפה מציג את כל הפרויקטים שלך עם מיקום על גבי מפה.",
        ],
      },
    ],
    tipsTitle: "טיפים שימושיים",
    tips: [
      "בתצוגת נייד, לחץ על אייקון התפריט (☰) כדי לפתוח את הניווט המלא.",
      "כתובות: התחל להקליד וקבל הצעות אוטומטיות — הבחירה שומרת גם מיקום למפה.",
      "כל הנתונים שלך פרטיים לחברה שלך בלבד.",
      "ניתן להעלות לוגו חברה בהגדרות, שיופיע במסמכים.",
    ],
    closing:
      "זהו! עכשיו אתה מוכן להתחיל. אם תיתקל בשאלה — לחצן העזרה הזה תמיד כאן, ליד שורת החיפוש.",
  },
  en: {
    dir: "ltr",
    triggerLabel: "Help",
    title: "User Guide — From 0 to 100",
    subtitle: "Everything you need to start working with the system",
    intro:
      "Welcome to BuildPro — a management platform for construction companies: clients, projects, quotes, invoices, field work, team and finances, all in one place. This guide walks you step by step from your first login to day-to-day management.",
    steps: [
      {
        icon: Rocket,
        title: "1. First login & setting up your company",
        body: [
          "Sign in with your Google account or with the email and password you were given.",
          "On your first login you'll be asked for your construction company's name — a one-time step that provisions a clean, private workspace for you.",
          "After setup, your system is completely empty — no clients, projects, or data from any other company appears. Everything is isolated and secure.",
        ],
      },
      {
        icon: Globe,
        title: "2. Language & direction",
        body: [
          "Switch between Hebrew and English anytime using the language toggle (the flag) at the top of the screen.",
          "The layout direction adjusts automatically (right-to-left for Hebrew).",
        ],
      },
      {
        icon: Users,
        title: "3. Adding your team",
        body: [
          "As an admin, go to the \"Employees\" tab to invite teammates.",
          "Click \"Invite Employee\", enter a name, email and role (Admin, Office Manager, Project Manager, or Field Worker).",
          "The employee signs in with the Google account of that email and is automatically joined to your company with the role you set.",
        ],
      },
      {
        icon: TrendingUp,
        title: "4. Managing leads",
        body: [
          "In the \"Leads\" tab, manage incoming inquiries: name, phone, property address, source and urgency.",
          "Track the lead's status (New, Contacted, Meeting, Quote Sent, Negotiation) through to closing.",
          "When a lead becomes a customer, convert it to a client in one click — the details carry over automatically.",
        ],
      },
      {
        icon: UserPlus,
        title: "5. Clients",
        body: [
          "In the \"Clients\" tab, add a new client with contact details and address (with address autocomplete).",
          "The client card shows all their projects, quotes, invoices and activity in one place.",
          "You can open a new project directly from the client card — it opens right there on the same screen.",
        ],
      },
      {
        icon: FolderKanban,
        title: "6. Projects",
        body: [
          "Create a project, link it to a client, and set the address, dates and contract value.",
          "Each project has tabs for full management: tasks, financials, field, team, milestones, quality control, risks, change requests, procurement and more.",
          "Progress tracking, documents and files are all centralized in the project card.",
        ],
      },
      {
        icon: Receipt,
        title: "7. Quotes & invoices",
        body: [
          "Build a detailed quote organized by categories and line items, including VAT and profit calculation.",
          "Issue invoices to clients and track payments and outstanding balances.",
          "The catalog (price list) lets you save items, units and prices for reuse in quotes.",
        ],
      },
      {
        icon: HardHat,
        title: "8. Field & resources",
        body: [
          "Field reports: work hours, expenses and daily logs per project.",
          "Manage employees (HR), equipment and tools — including assigning them to projects.",
          "Tasks: create and assign tasks to team members, with priorities and due dates.",
        ],
      },
      {
        icon: Wallet,
        title: "9. Finance & procurement",
        body: [
          "The finance screen centralizes revenue, costs and profitability with a profit/loss report per project.",
          "Manage suppliers and subcontractors, contracts and payments.",
          "The catalog supports importing and exporting items via CSV (including descriptions).",
        ],
      },
      {
        icon: LayoutDashboard,
        title: "10. The dashboard",
        body: [
          "The home screen shows key metrics: leads, active projects, tasks, revenue and more.",
          "You can customize the widgets — drag, resize, add and remove (click \"Edit\").",
          "The map widget shows all your projects with a location pinned on a map.",
        ],
      },
    ],
    tipsTitle: "Useful tips",
    tips: [
      "On mobile, tap the menu icon (☰) to open the full navigation.",
      "Addresses: start typing to get suggestions — selecting one also saves a map location.",
      "All your data is private to your company only.",
      "You can upload a company logo in Settings, which appears on documents.",
    ],
    closing:
      "That's it! You're ready to get started. If you ever have a question, this Help button is always here, next to the search bar.",
  },
};

// ─── Component ──────────────────────────────────────────────────────────────────

export function HelpGuide() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const g = locale === "he" ? GUIDES.he : GUIDES.en;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={g.triggerLabel}
        title={g.triggerLabel}
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      <DialogContent
        dir={g.dir}
        className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border text-start">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <HelpCircle className="h-5 w-5 text-primary" />
            </span>
            {g.title}
          </DialogTitle>
          <DialogDescription className="text-start">{g.subtitle}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5 text-start">
            {/* Intro */}
            <p className="text-sm leading-relaxed text-muted-foreground">{g.intro}</p>

            {/* Steps */}
            <div className="space-y-4">
              {g.steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card/50 p-4"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">
                        {step.title}
                      </h3>
                    </div>
                    <ul className="space-y-1.5 ps-1">
                      {step.body.map((line, j) => (
                        <li
                          key={j}
                          className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Tips */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
                💡 {g.tipsTitle}
              </h3>
              <ul className="space-y-1.5">
                {g.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm leading-relaxed text-amber-800/90 dark:text-amber-200/80"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Closing */}
            <p className="text-sm leading-relaxed text-foreground font-medium">
              {g.closing}
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
