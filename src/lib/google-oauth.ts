/**
 * Minimal custom Google OAuth helper (no external SDK).
 * Uses the standard web OAuth 2.0 authorization-code flow against Google.
 */

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

export type GoogleProfile = {
  email: string;
  name: string;
  picture: string;
};

/** Whether both required Google env vars are present. */
export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Derive the OAuth redirect URI. Prefers NEXT_PUBLIC_APP_URL; otherwise falls
 * back to the supplied request origin.
 */
export function getRedirectUri(origin: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || origin).replace(/\/+$/, "");
  return `${base}/api/auth/google/callback`;
}

/** Build the Google consent-screen URL to redirect the user to. */
export function getGoogleAuthUrl(redirectUri: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchange an authorization code for the user's Google profile.
 * Throws on missing env or any failed fetch.
 */
export async function exchangeCodeForProfile(
  code: string,
  redirectUri: string
): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth env vars are not configured");
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed: ${tokenRes.status}`);
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    throw new Error("Google token response missing access_token");
  }

  const profileRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    throw new Error(`Google userinfo fetch failed: ${profileRes.status}`);
  }

  const profile = (await profileRes.json()) as {
    email?: string;
    name?: string;
    picture?: string;
  };

  if (!profile.email) {
    throw new Error("Google profile missing email");
  }

  return {
    email: profile.email,
    name: profile.name || profile.email,
    picture: profile.picture || "",
  };
}
