import { createTRPCRouter } from "@/server/trpc/init";
import { roomRouter } from "@/server/trpc/routers/room";

export const appRouter = createTRPCRouter({
  room: roomRouter,
});

export type AppRouter = typeof appRouter;
