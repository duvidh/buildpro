import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Paths that never require authentication
const PUBLIC_PATHS = ["/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Fast-path: static files that slip past the matcher ──────────────────────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json" ||
    /\/workbox-[^/]+\.js$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // ── JWT_SECRET check ─────────────────────────────────────────────────────────
  // Resolved inside the function (not at module level) so a missing env var
  // does NOT crash the middleware module during the Vercel cold-start import.
  const rawSecret = process.env.JWT_SECRET;
  if (!rawSecret) {
    console.error(
      "[middleware] JWT_SECRET is not set — cannot verify sessions. " +
        "Add it to Vercel → Settings → Environment Variables."
    );
    // Fail open for public routes; send everything else to login
    if (isPublic) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const secret = new TextEncoder().encode(rawSecret);
  const token  = req.cookies.get("bp_session")?.value;

  // Verify JWT without hitting the DB (stateless edge check)
  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, secret);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Already logged in → redirect away from login page
  if (isPublic && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Not logged in → redirect to login
  if (!isPublic && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on every path EXCEPT:
     *   _next/static  – compiled assets
     *   _next/image   – image optimisation
     *   favicon.ico
     *   sw.js         – PWA service worker
     *   workbox-*.js  – Workbox runtime bundles
     *   common static extensions (images, fonts, icons …)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|workbox-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
