import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import {
  exchangeCodeForProfile,
  getRedirectUri,
  type GoogleProfile,
} from "@/lib/google-oauth";
import { UserRole } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");

  if (!code || oauthError) {
    return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
  }

  let profile: GoogleProfile;
  try {
    const redirectUri = getRedirectUri(url.origin);
    profile = await exchangeCodeForProfile(code, redirectUri);
  } catch (e) {
    console.error(
      "[google callback] exchange failed:",
      e instanceof Error ? e.message : e
    );
    return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
  }

  const email = profile.email.toLowerCase();

  try {
    // Case-insensitive search to match pre-registered invite records regardless
    // of how the email was originally stored.
    let user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (user) {
      // Existing account (including pre-registered invites) — mark provider and
      // backfill avatar if missing. companyId and role are intentionally NOT
      // modified so invite-assigned values are strictly preserved.
      user = await db.user.update({
        where: { id: user.id },
        data: {
          authProvider: "google",
          ...(user.avatarUrl ? {} : { avatarUrl: profile.picture || null }),
        },
      });
    } else {
      // Truly new account — no password, default role, no company yet.
      user = await db.user.create({
        data: {
          name: profile.name || email,
          email,
          passwordHash: null,
          role: UserRole.FIELD_WORKER,
          authProvider: "google",
          avatarUrl: profile.picture || null,
          active: true,
          companyId: null,
        },
      });
    }

    await createSession({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
    });

    // Core requirement: company → dashboard, otherwise onboarding.
    return NextResponse.redirect(
      new URL(user.companyId ? "/dashboard" : "/onboarding", req.url)
    );
  } catch (e) {
    console.error(
      "[google callback] user upsert failed:",
      e instanceof Error ? e.message : e
    );
    return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
  }
}
