import { NextRequest, NextResponse } from "next/server";
import {
  getGoogleAuthUrl,
  getRedirectUri,
  isGoogleConfigured,
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=google_unconfigured", req.url)
    );
  }

  const origin = new URL(req.url).origin;
  const redirectUri = getRedirectUri(origin);
  return NextResponse.redirect(getGoogleAuthUrl(redirectUri));
}
