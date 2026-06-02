import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

// ─── next-intl (cookie-based locale, no URL prefix) ──────────────────────────
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// ─── PWA ─────────────────────────────────────────────────────────────────────
const withPWA = withPWAInit({
  dest: "public",
  // NOTE: cacheOnFrontEndNav + aggressiveFrontEndNavCaching were removed.
  // They made the service worker cache JS chunks aggressively across client-side
  // navigations; after a new deploy the SW would serve stale chunks whose hashed
  // siblings no longer exist on the server, producing a ChunkLoadError and the
  // "please refresh the page" prompt (most visible right after a locale switch,
  // which triggers a full reload). Letting Workbox skipWaiting + clientsClaim and
  // not pre-caching navigations keeps each deploy's chunks consistent.
  reloadOnOnline: true,
  // SW is disabled in development so hot-reload stays clean.
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
    // Drop precaches from previous deployments so old chunk references are
    // never served after an update.
    cleanupOutdatedCaches: true,
  },
});

const securityHeaders = [
  { key: "X-Frame-Options",         value: "DENY" },
  { key: "X-Content-Type-Options",  value: "nosniff" },
  { key: "X-DNS-Prefetch-Control",  value: "on" },
  { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",      value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // Next.js requires unsafe-eval in dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(withPWA(nextConfig));
