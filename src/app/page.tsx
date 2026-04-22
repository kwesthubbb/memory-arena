import { HomeShell } from "@/components/home-shell";
import { getServerSession } from "@/server/auth/session";
import { getDashboardData, getRecentMatches } from "@/server/game/service";

export const dynamic = "force-dynamic";

export default async function Home() {
  let session: Awaited<ReturnType<typeof getServerSession>> | null = null;
  let dashboard: Awaited<ReturnType<typeof getDashboardData>> | null = null;
  let recentMatches: Awaited<ReturnType<typeof getRecentMatches>> = [];

  try {
    session = await getServerSession();
  } catch {
    session = null;
  }

  try {
    dashboard = session?.user
      ? await getDashboardData({ userId: session.user.id })
      : null;
  } catch {
    dashboard = null;
  }

  try {
    recentMatches = dashboard?.recentMatches ?? (await getRecentMatches());
  } catch {
    recentMatches = [];
  }

  return (
    <HomeShell
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
      dashboard={dashboard}
      recentMatches={recentMatches}
    />
  );
}

