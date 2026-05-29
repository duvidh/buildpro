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

    redirect("/dashboard");
  } catch (error) {
    // Next.js redirect() works by throwing a special internal error.
    // Re-throwing here ensures it is never swallowed by this catch block
    // and mistakenly surfaced as "[object Object]" in the form state.
    throw error;
  }
}

export async function logout() {
  try {
    await deleteSession();
    redirect("/login");
  } catch (error) {
    throw error;
  }
}
