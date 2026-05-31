import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { DirectionProvider } from "@/components/providers/direction-provider";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

// ─── PWA / SEO metadata ───────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "BuildPro | Construction Management",
  description: "CRM/ERP platform for construction companies",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BuildPro",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8f8" },
    { media: "(prefers-color-scheme: dark)",  color: "#252525" },
  ],
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

// ─── Root layout ──────────────────────────────────────────────────────────────

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale   = await getLocale();
  const messages = await getMessages();
  const dir      = locale === "he" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={heebo.variable} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          themes={[
            "light", "dark", "teal",
            "theme-green", "theme-blue", "theme-purple",
            "theme-orange", "theme-rose", "theme-amber",
            "theme-indigo", "theme-slate",
          ]}
          enableSystem={false}
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            {/* Tell Radix primitives (dropdowns, selects, …) the text direction
                so they open/align per locale instead of always LTR. */}
            <DirectionProvider dir={dir}>
              <TooltipProvider>{children}</TooltipProvider>
            </DirectionProvider>
          </NextIntlClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
