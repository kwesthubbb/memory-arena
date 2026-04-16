import { getServerSession } from "@/server/auth/session";
import { ProfilePage } from "@/components/profile-page";

export default async function ProfileSettingsPage() {
  const session = await getServerSession();

  return (
    <ProfilePage
      session={
        session?.user
          ? {
              id: session.user.id,
              name: session.user.name ?? "Игрок",
              email: session.user.email,
              image: (session.user as { image?: string | null }).image ?? null,
            }
          : null
      }
    />
  );
}
