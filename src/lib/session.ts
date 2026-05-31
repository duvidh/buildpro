import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "bp_session";

/**
 * Returns the encoded JWT secret.
 * Called lazily — only when a JWT operation is actually needed — so the
 * module can be imported without crashing during the Vercel cold-start phase
 * even if JWT_SECRET has not been set yet in the environment.
 */
function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) {
    throw new Error(
      "JWT_SECRET is not configured. " +
        "Add it to your Vercel environment variables (Settings → Environment Variables)."
    );
  }
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  userId: string;
  role: string;
  name: string;
  email: string;
  mustChangePassword?: boolean;
};

export async function signToken(payload: SessionUser): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

/** Read the session from the request cookie (server components / actions). */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Write the session cookie (server actions only). */
export async function createSession(user: SessionUser): Promise<void> {
  const token = await signToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

/** Clear the session cookie. */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
