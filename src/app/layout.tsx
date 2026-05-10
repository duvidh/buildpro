import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

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
      <body className="min-h-full antialiased bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-50 via-white to-stone-100/50">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
