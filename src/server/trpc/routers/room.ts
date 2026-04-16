import { z } from "zod";

import {
  buildRoomSnapshot,
  createRoom,
  getDashboardData,
  leaveRoom,
  startGame,
  submitAnswer,
  joinRoom,
} from "@/server/game/service";
import { protectedProcedure, createTRPCRouter } from "@/server/trpc/init";

export const roomRouter = createTRPCRouter({
  dashboard: protectedProcedure.query(({ ctx }) =>
    getDashboardData({
      userId: ctx.session!.user.id,
    }),
  ),
  room: protectedProcedure
    .input(
      z.object({
        code: z.string().min(4).max(12),
      }),
    )
    .query(({ ctx, input }) => buildRoomSnapshot(input.code, ctx.session!.user.id)),
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(3).max(60),
        maxPlayers: z.number().int().min(2).max(6),
        botCount: z.number().int().min(0).max(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.botCount > input.maxPlayers - 1) {
        throw new Error("Количество ботов превышает число свободных мест");
      }

      const roomCode = await createRoom({
        hostUserId: ctx.session!.user.id,
        displayName: ctx.session!.user.name ?? "Игрок",
        title: input.title,
        maxPlayers: input.maxPlayers,
        botCount: input.botCount,
      });

      return {
        roomCode,
      };
    }),
  join: protectedProcedure
    .input(
      z.object({
        roomCode: z.string().min(4).max(12),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const roomCode = await joinRoom({
        roomCode: input.roomCode.toUpperCase(),
        userId: ctx.session!.user.id,
        displayName: ctx.session!.user.name ?? "Игрок",
      });

      return {
        roomCode,
      };
    }),
  leave: protectedProcedure
    .input(
      z.object({
        roomCode: z.string().min(4).max(12),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await leaveRoom({
        roomCode: input.roomCode.toUpperCase(),
        userId: ctx.session!.user.id,
      });

      return {
        ok: true,
      };
    }),
  start: protectedProcedure
    .input(
      z.object({
        roomCode: z.string().min(4).max(12),
      }),
    )
    .mutation(({ ctx, input }) =>
      startGame({
        roomCode: input.roomCode.toUpperCase(),
        userId: ctx.session!.user.id,
      }),
    ),
  submit: protectedProcedure
    .input(
      z.object({
        roomCode: z.string().min(4).max(12),
        sequence: z.array(z.enum(["sun", "wave", "mint", "berry"])).min(1).max(24),
      }),
    )
    .mutation(({ ctx, input }) =>
      submitAnswer({
        roomCode: input.roomCode.toUpperCase(),
        userId: ctx.session!.user.id,
        submittedSequence: input.sequence,
      }),
    ),
});
