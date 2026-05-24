export const dynamic = "force-dynamic";

import { User } from "lucide-react";
import { seedUsers, getCurrentUser } from "@/actions/users";
import { ProfileClient } from "@/components/profile/profile-client";
import { notFound } from "next/navigation";

export default async function ProfilePage() {
  if (process.env.NODE_ENV !== "production") await seedUsers();
  const user = await getCurrentUser();
  if (!user) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">פרופיל אישי</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ניהול פרטים אישיים וסיסמה
          </p>
        </div>
      </div>

      <ProfileClient user={user} />
    </div>
  );
}
