import { redirect } from "next/navigation";

import { RoomClient } from "@/components/room-client";
import { getServerSession } from "@/server/auth/session";
import { buildRoomSnapshot } from "@/server/game/service";

export const dynamic = "force-dynamic";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const { code } = await params;
  const room = await buildRoomSnapshot(code.toUpperCase(), session.user.id);

  return (
    <RoomClient
      currentUserId={session.user.id}
      initialRoom={room}
      currentUserName={session.user.name ?? "Игрок"}
    />
  );
}

