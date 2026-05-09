import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "BuildPro | מערכת ניהול קבלנות",
  description: "מערכת CRM/ERP לחברות קבלנות בנייה ישראליות",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="min-h-full antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
