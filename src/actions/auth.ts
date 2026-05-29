"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";

export async function login(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "נא למלא אימייל וסיסמה" };
  }

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return { error: "אימייל או סיסמה שגויים" };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { error: "אימייל או סיסמה שגויים" };
    }

    await createSession({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    // A real DB / bcrypt / JWT error — log it and return a safe message.
    // Do NOT re-throw here; that would surface as "[object Object]" in prod.
    console.error("[login] unexpected error:", error);
    return { error: "שגיאת שרת, אנא נסה שוב מאוחר יותר" };
  }

  // ⚠️  redirect() MUST be called OUTSIDE the try/catch.
  // next/navigation's redirect() signals Next.js by throwing a special
  // internal error object.  If that throw is caught and not re-thrown it
  // gets serialised as "[object Object]" and the navigation never happens.
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  // Same rule: redirect() outside any try/catch.
  redirect("/login");
}
