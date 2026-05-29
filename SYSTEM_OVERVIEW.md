# BuildPro — System Overview (מסמך סקירת מערכת)

> מסמך זה מיועד לסקירת המערכת על ידי מפתח בכיר.  
> נכתב: מאי 2026

---

## 1. מה המערכת הזאת?

**BuildPro** היא מערכת ERP (Enterprise Resource Planning) לניהול חברות בנייה וקבלנות.  
המערכת מנוהלת דרך דפדפן, בעברית, RTL מלא.

### מה המערכת פותרת:
- ניהול לידים → לקוחות → פרויקטים → הצעות מחיר → חשבוניות
- תכנון פרויקטים (WBS, Gantt, אבני דרך, משימות)
- ניהול שטח (יומנים, ציוד, עובדים, נוכחות)
- ניהול כספים (הכנסות, הוצאות, תשלומים, תחזיות)
- בקרת איכות, ניהול סיכונים, בקשות שינוי
- ניהול ספקים וחוזים

---

## 2. Stack טכנולוגי

| שכבה | טכנולוגיה |
|------|-----------|
| Framework | Next.js 16.2.6 (App Router) |
| UI Runtime | React 19.2.4 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Forms | React Hook Form + Zod validation |
| ORM | Prisma 7.8.0 |
| Database | PostgreSQL (Neon serverless) |
| Auth | JWT (jose library) — cookie-based sessions |
| Charts | Recharts |
| Toasts | Sonner |
| Icons | Lucide React |
| Deployment | Vercel |

---

## 3. ארכיטקטורה

### סוג ארכיטקטורה: Server-first Next.js App Router

```
┌─────────────────────────────────────────────┐
│              Vercel Edge (Middleware)         │
│         JWT cookie auth guard                │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           Next.js App Router                 │
│  ┌─────────────────────────────────────────┐ │
│  │  Server Components (data fetching)       │ │
│  │  → Server Actions (mutations)            │ │
│  │  → Client Components (interactivity)     │ │
│  └─────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          Prisma ORM                          │
│  → Neon PostgreSQL (serverless)              │
└─────────────────────────────────────────────┘
```

### Data Flow:
1. **User request** → Middleware checks JWT cookie
2. **Page load** → Server Component fetches data directly from DB via Prisma
3. **User action** → Client Component calls Server Action
4. **Server Action** → validates with Zod → writes to DB → `revalidatePath()`
5. **UI** auto-refreshes with new data

### אין API Routes!
כל mutations עוברות דרך **Server Actions** — פישוט משמעותי של הארכיטקטורה.

---

## 4. מבנה קבצים

```
buildpro/
├── prisma/
│   ├── schema.prisma          # כל מבנה הדאטהבייס (25 מודלים)
│   └── prisma.config.ts       # הגדרות Prisma
│
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Tailwind + CSS variables
│   │   ├── login/             # דף התחברות (public)
│   │   └── (app)/             # כל הדפים המוגנים (מחייב JWT)
│   │       ├── layout.tsx     # Layout עם sidebar + header
│   │       ├── dashboard/
│   │       ├── leads/
│   │       ├── clients/
│   │       │   └── [id]/
│   │       ├── projects/
│   │       │   └── [id]/
│   │       ├── quotes/
│   │       │   └── [id]/
│   │       ├── tasks/
│   │       ├── daily-logs/
│   │       ├── field/
│   │       ├── equipment/
│   │       ├── hr/
│   │       ├── subcontractors/
│   │       ├── finance/
│   │       ├── catalog/
│   │       ├── settings/
│   │       └── profile/
│   │
│   ├── components/
│   │   ├── ui/                # shadcn/ui base components (30+)
│   │   ├── layout/
│   │   │   ├── app-sidebar.tsx
│   │   │   └── app-header.tsx
│   │   ├── dashboard/
│   │   ├── leads/
│   │   ├── clients/
│   │   ├── projects/
│   │   ├── quotes/
│   │   ├── tasks/
│   │   ├── field/
│   │   ├── catalog/
│   │   ├── equipment/
│   │   ├── hr/
│   │   ├── subcontractors/
│   │   ├── finance/
│   │   ├── daily-logs/
│   │   ├── settings/
│   │   └── profile/
│   │
│   ├── actions/               # Server Actions (mutations)
│   │   ├── auth.ts
│   │   ├── clients.ts
│   │   ├── leads.ts
│   │   ├── projects.ts
│   │   ├── quotes.ts
│   │   ├── tasks.ts
│   │   ├── wbs.ts
│   │   ├── milestones.ts
│   │   ├── dashboard.ts
│   │   ├── finance.ts
│   │   ├── field.ts
│   │   ├── equipment.ts
│   │   ├── hr.ts
│   │   ├── subcontractors.ts
│   │   ├── daily-logs.ts
│   │   ├── procurement.ts
│   │   ├── change-orders.ts
│   │   ├── risks.ts
│   │   ├── quality.ts
│   │   ├── catalog.ts
│   │   ├── settings.ts
│   │   └── users.ts
│   │
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── session.ts         # JWT helpers
│   │   ├── utils.ts           # cn() utility
│   │   ├── schemas/           # Zod schemas לכל entity
│   │   └── constants/         # Enums ו-config
│   │
│   └── generated/
│       └── prisma/            # Auto-generated Prisma types
│
└── middleware.ts              # JWT auth guard (edge)
```

---

## 5. מסד הנתונים — מודלים (25 מודלים)

### Authentication
| מודל | תיאור |
|------|--------|
| `User` | משתמש מערכת — email, password (bcrypt), role (ADMIN/MANAGER/USER/FIELD) |

### CRM
| מודל | תיאור |
|------|--------|
| `Lead` | ליד — שם, טלפון, אימייל, כתובת, עיר, סוג בנייה[], תקציב, סטטוס, מקור |
| `Client` | לקוח — נוצר מהמרת ליד או ישירות, מקושר לפרויקטים |

### Projects
| מודל | תיאור |
|------|--------|
| `Project` | פרויקט — שם, לקוח, תאריכים, תקציב, סטטוס, מיקום |
| `ProjectSettings` | הגדרות ספציפיות לפרויקט |
| `ProjectMember` | חברי צוות בפרויקט + תפקיד (MANAGER/ENGINEER/WORKER/VIEWER) |
| `ProjectFile` | קבצים מצורפים לפרויקט |

### Planning
| מודל | תיאור |
|------|--------|
| `Milestone` | אבן דרך — תאריך יעד, סטטוס, קישור לפרויקט |
| `Task` | משימה — כותרת, תיאור, עדיפות, סטטוס, תאריכים, משויך לעובד |

### WBS & Catalog
| מודל | תיאור |
|------|--------|
| `CatalogItem` | פריט קטלוג — שם, יחידת מידה, מחיר |
| `WorkPackage` | חבילת עבודה ב-WBS |
| `BOMItem` | Bill of Materials — פריטים בחבילת עבודה |

### Quality & Safety
| מודל | תיאור |
|------|--------|
| `QualityCheck` | בדיקת איכות — תוצאה (PASS/FAIL/PENDING) |
| `NCR` | Non-Conformance Report — חריגה מאיכות, חומרה, סטטוס |
| `Risk` | סיכון — תיאור, הסתברות, השפעה, מצב |
| `ChangeRequest` | בקשת שינוי — תיאור, עלות, סטטוס |
| `DailyLog` | יומן שטח יומי — עובדים, ציוד, עבודות, תנאי מזג אוויר |

### HR & Field
| מודל | תיאור |
|------|--------|
| `Employee` | עובד — שם, תפקיד, שכר, פרטי קשר, פעיל/לא פעיל |
| `TimeEntry` | רישום שעות עובד |
| `Expense` | הוצאה — קטגוריה, סכום, מקושרת לפרויקט |
| `Equipment` | ציוד — שם, סוג, מספר סידורי, סטטוס |
| `EquipmentLog` | יומן שימוש בציוד |

### Finance
| מודל | תיאור |
|------|--------|
| `Quote` | הצעת מחיר — כותרת, לקוח, פרויקט, סטטוס, תאריך תפוגה |
| `QuoteItem` | שורה בהצעת מחיר — תיאור, כמות, מחיר יחידה, אחוז רווח |
| `Invoice` | חשבונית — מקושרת להצעת מחיר, סטטוס תשלום |
| `Payment` | תשלום ספציפי — שיטת תשלום, סכום, תאריך |

### Procurement
| מודל | תיאור |
|------|--------|
| `Supplier` | ספק — שם, סוג (MATERIAL/LABOR/EQUIPMENT/SERVICE) |
| `Contract` | חוזה עם ספק — סכום, תאריכים, סטטוס |
| `SupplierPayment` | תשלום לספק |

### System
| מודל | תיאור |
|------|--------|
| `Notification` | התראות למשתמשים |
| `ActivityLog` | לוג פעולות במערכת |
| `SystemSetting` | הגדרות מערכת גלובליות (key-value) |

---

## 6. מודולים — מה כל אחד עושה

### 🔵 לידים ומכירות (`/leads`)
- טבלה עם כל הלידים
- סינון לפי שם, טלפון, נציג
- מיון לפי שם, סטטוס, תקציב
- הוספת ליד חדש — טופס inline (לא popup)
- עדכון סטטוס ליד ישירות מהטבלה
- המרת ליד ללקוח בלחיצה אחת
- שליחת וואטסאפ ישיר מהטבלה
- עמודות: שם, טלפון+WhatsApp, כתובת, עיר, מקור, סטטוס, סוג בנייה, תקציב

**סטטוסי ליד:** חדש → יצר קשר → פגישה נקבעה → הצעת מחיר נשלחה → משא ומתן → הומר / אבד

### 🟢 לקוחות (`/clients`)
- טבלה עם כל הלקוחות
- כרטיס לקוח עם tabs: פרטים, פרויקטים, הצעות מחיר, מסמכים
- קישור לפרויקטים ולידים שהומרו

### 🟠 פרויקטים (`/projects`, `/projects/[id]`)
- רשימת פרויקטים עם סטטוס ותקציב
- דף פרויקט עם tabs:
  - **פרטים** — מידע בסיסי, לקוח, צוות, תאריכים
  - **WBS** — Work Breakdown Structure עם היררכיה
  - **משימות** — Kanban board
  - **Gantt** — תצוגת ציר זמן
  - **אבני דרך** — Timeline
  - **רכש** — חוזים עם ספקים
  - **שינויים** — Change Requests
  - **סיכונים** — Risk Register
  - **בקרת איכות** — QC checks + NCR

### 🟡 הצעות מחיר (`/quotes`, `/quotes/[id]`)
- יצירת הצעת מחיר עם שורות פריטים
- חישוב אוטומטי של עלות + רווח + מע"מ
- מחיר יחידה מהקטלוג
- שינוי סטטוס (טיוטה → נשלחה → אושרה → נדחתה)

### ⚙️ קטלוג (`/catalog`)
- ניהול פריטי עבודה וחומרים
- מחיר יחידה, יחידת מידה, קטגוריה
- שימוש בהצעות מחיר ו-WBS

### 📋 משימות (`/tasks`)
- תצוגת כל המשימות מכל הפרויקטים
- סינון לפי סטטוס, עדיפות, עובד
- עדכון סטטוס drag & drop (Kanban)

### 📔 יומן שטח (`/daily-logs`)
- רישום יומי של עובדים בשטח
- ציוד בשימוש
- עבודות שבוצעו
- מזג אוויר וחריגות

### 🔧 שטח (`/field`)
- ממשק מפושט לעובדי שטח
- רישום שעות ועבודות
- קריאה בנייד

### 🏗️ ציוד (`/equipment`)
- מעקב ציוד (כלי עבודה, מכונות)
- סטטוס: זמין / בשימוש / בתחזוקה / מושבת
- היסטוריית שימוש לפי פרויקט

### 👷 משאבי אנוש (`/hr`)
- רשימת עובדים עם תפקיד ופרטי קשר
- שכר שעתי/חודשי
- רישום שעות עבודה

### 🤝 קבלני משנה (`/subcontractors`)
- ניהול ספקים וקבלני משנה
- חוזים ותשלומים

### 💰 כספים (`/finance`)
- סיכום הכנסות מול הוצאות
- גרפים לפי חודש/פרויקט
- מעקב תשלומים ממשים

### ⚙️ הגדרות (`/settings`)
- פרטי חברה (שם, לוגו, ח"פ)
- הגדרות מע"מ ומטבע
- ניהול משתמשים

---

## 7. Authentication & Authorization

### שיטה: JWT Cookie (Stateless)

```
1. המשתמש מתחבר → שרת מוציא JWT עם { userId, role }
2. JWT נשמר ב-cookie מאובטח (httpOnly, secure)
3. Middleware מאמת את ה-JWT בכל request
4. Server Components קוראים את היוזר מה-cookie
```

### תפקידים (Roles):
| Role | הרשאות |
|------|--------|
| `ADMIN` | גישה מלאה לכל המערכת |
| `MANAGER` | ניהול פרויקטים, לקוחות, הצעות |
| `USER` | צפייה ועריכה בסיסית |
| `FIELD` | ממשק שטח בלבד |

---

## 8. סדר עבודה טיפוסי במערכת

```
1. ליד מגיע (מוסיפים בדף לידים)
         ↓
2. ליד מומר ללקוח (לחיצה אחת)
         ↓
3. פרויקט חדש נפתח ללקוח
         ↓
4. הצעת מחיר נוצרת (עם פריטים מהקטלוג)
         ↓
5. הצעה מאושרת → חשבונית נוצרת
         ↓
6. פרויקט מתוכנן (WBS + Gantt + אבני דרך)
         ↓
7. משימות מוקצות לעובדים
         ↓
8. שטח — יומנים יומיים + רישום שעות
         ↓
9. בקרת איכות + ניהול שינויים
         ↓
10. תשלום סופי + סגירת פרויקט
```

---

## 9. מה עובד / מה חסר

### ✅ עובד:
- Authentication מלא (login/logout/JWT)
- CRM מלא (לידים + לקוחות + המרה)
- פרויקטים עם כל ה-tabs
- הצעות מחיר עם חישובים
- קטלוג פריטים
- ניהול עובדים וציוד
- יומן שטח
- כספים בסיסיים
- RTL עברי מלא
- Responsive (נייד + דסקטופ)
- Sorting ו-filtering בטבלאות

### ⚠️ חסר / לא מיושם מלא:
- **מסמכים / העלאת קבצים** — tabs קיימים אך מציגים "יתווסף בקרוב"
- **יומן פעילות / Activity Log** — UI קיים, לוגיקה חסרה
- **התראות (Notifications)** — מודל קיים, UI חסר
- **דאשבורד** — גרפי הכנסות קיימים, אך חלק מהנתונים סטטיים
- **Drag & Drop** ב-Kanban — UI קיים אך DnD לא מיושם
- **יצוא PDF** להצעות מחיר וחשבוניות
- **בקרת גישה לפי Role** — middleware מאמת JWT אך אין הגבלות לפי role בתוך הדפים
- **Search גלובלי** — input קיים ב-header אך לא פונקציונלי
- **Email notifications** — אין שליחת מיילים
- **Multi-tenant** — מערכת מתוכננת לחברה אחת

---

## 10. שאלות פתוחות לסקירה עם מפתח בכיר

1. **Authentication**: האם JWT stateless מספיק? מה לגבי refresh tokens ו-session invalidation?
2. **Authorization**: האם כדאי להוסיף middleware לפי role בכל route, או לשמור server-side?
3. **File uploads**: מה הגישה המועדפת לאחסון קבצים — Vercel Blob? S3? Cloudinary?
4. **Real-time**: האם נדרשים עדכונים real-time (לדוגמה ב-Kanban)? WebSockets? SSE? Polling?
5. **Gantt**: מיושם כ-custom component פשוט — האם כדאי לאמץ ספרייה חיצונית?
6. **Performance**: Server Components עם `force-dynamic` בכל דף — האם ניתן להוסיף caching?
7. **Testing**: אין בדיקות כלל — unit? integration? E2E?
8. **Error handling**: Server Actions מחזירות `{ success, error }` — האם מספיק? מה לגבי logging?
9. **Database**: Neon serverless — cold starts? connection pooling מוגדר?
10. **Scale**: האם הארכיטקטורה תחזיק עם מאות פרויקטים ומשתמשים?

---

## 11. הגדרת סביבה

```bash
# דרישות
Node.js 18+
npm / yarn / pnpm

# התקנה
git clone https://github.com/duvidh/buildpro.git
cd buildpro
npm install

# קובץ .env (ליד שורש הפרויקט)
DATABASE_URL="postgresql://..."
JWT_SECRET="..."

# הפעלה
npm run dev        # פיתוח
npm run build      # production build
```

---

*BuildPro — Construction ERP | Next.js 16 + Prisma + Neon PostgreSQL*
