export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { buildRoomSnapshot } from "@/server/game/service";
import { roomEvents } from "@/server/game/events";

const encoder = new TextEncoder();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return new Response("Нужна авторизация", { status: 401 });
  }

  const { code } = await params;
  const snapshot = await buildRoomSnapshot(code.toUpperCase(), session.user.id);

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      send(snapshot);

      const unsubscribe = roomEvents.subscribe(code.toUpperCase(), (nextSnapshot) => {
        send(nextSnapshot);
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
