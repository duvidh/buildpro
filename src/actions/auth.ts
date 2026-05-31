"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, deleteSession, getSession } from "@/lib/session";
import { DEFAULT_PASSWORD } from "@/lib/auth-constants";

export async function login(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "נא למלא אימייל וסיסמה" };
  }

  // Hoisted so it survives outside the try/catch where redirect() runs.
  let mustChange = false;

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.active || !user.passwordHash) {
      // No passwordHash → Google-only account; can't log in with a password.
      return { error: "אימייל או סיסמה שגויים" };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { error: "אימייל או סיסמה שגויים" };
    }

    mustChange = password === DEFAULT_PASSWORD;

    await createSession({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      mustChangePassword: mustChange,
    });
  } catch (error) {
    // A real DB / bcrypt / JWT error — log it and return a safe message.
    // Do NOT re-throw here; that would surface as "[object Object]" in prod.
    console.error(
      "[login] unexpected error:",
      error instanceof Error
        ? error.message
        : JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
    return { error: "שגיאת שרת, אנא נסה שוב מאוחר יותר" };
  }

  // ⚠️  redirect() MUST be called OUTSIDE the try/catch.
  // next/navigation's redirect() signals Next.js by throwing a special
  // internal error object.  If that throw is caught and not re-thrown it
  // gets serialised as "[object Object]" and the navigation never happens.
  redirect(mustChange ? "/change-password" : "/dashboard");
}

/**
 * Lets the currently authenticated user change their own password.
 * Used by the forced first-login change-password flow. Re-issues the session
 * with mustChangePassword:false so middleware stops trapping them on the page.
 */
export async function changeOwnPassword(
  newPassword: string
): Promise<{ success: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "unauthorized" };

  if (!newPassword || newPassword.length < 6) {
    return { error: "too_short" };
  }
  if (newPassword === DEFAULT_PASSWORD) {
    return { error: "same_as_default" };
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const user = await db.user.update({
      where: { id: session.userId },
      data: { passwordHash },
      select: { id: true, role: true, name: true, email: true },
    });

    await createSession({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      mustChangePassword: false,
    });
  } catch (error) {
    console.error(
      "[changeOwnPassword] unexpected error:",
      error instanceof Error
        ? error.message
        : JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
    return { error: "generic" };
  }

  return { success: true };
}

export async function logout() {
  await deleteSession();
  // Same rule: redirect() outside any try/catch.
  redirect("/login");
}
