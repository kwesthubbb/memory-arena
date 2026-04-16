import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";
import {
  gameRooms,
  gameRounds,
  roomPlayers,
  roundAnswers,
} from "@/db/game-schema";
import { buildBotAnswer, getBotDelay } from "@/server/game/bot";
import {
  createCode,
  createSequence,
  nextSequenceLength,
  resolveRound,
} from "@/server/game/engine";
import { roomEvents } from "@/server/game/events";
import type {
  RoomSnapshot,
  Signal,
} from "@/server/game/types";

type Viewer = {
  userId: string;
};

type TimerBag = {
  reveal?: NodeJS.Timeout;
  resolve?: NodeJS.Timeout;
  nextRound?: NodeJS.Timeout;
  bots: NodeJS.Timeout[];
};

const roomTimers = new Map<string, TimerBag>();

const memorizationMs = 3200;
const answerMs = 15000;
const betweenRoundsMs = 2800;

const getTimers = (roomId: string) => {
  const timers = roomTimers.get(roomId) ?? { bots: [] };
  roomTimers.set(roomId, timers);
  return timers;
};

const clearRoomTimers = (roomId: string) => {
  const timers = roomTimers.get(roomId);
  if (!timers) {
    return;
  }

  if (timers.reveal) clearTimeout(timers.reveal);
  if (timers.resolve) clearTimeout(timers.resolve);
  if (timers.nextRound) clearTimeout(timers.nextRound);
  for (const botTimer of timers.bots) clearTimeout(botTimer);

  roomTimers.delete(roomId);
};

const getRoomByCode = async (code: string) => {
  const room = await db.query.gameRooms.findFirst({
    where: eq(gameRooms.code, code),
  });

  if (!room) {
    throw new Error("Комната не найдена");
  }

  return room;
};

const getPlayerInRoom = async (roomId: string, userId: string) =>
  db.query.roomPlayers.findFirst({
    where: and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId)),
  });

const listPlayers = async (roomId: string) =>
  db.query.roomPlayers.findMany({
    where: eq(roomPlayers.roomId, roomId),
    orderBy: (table, { asc }) => [asc(table.seat)],
  });

const reseatPlayers = async (roomId: string) => {
  const players = await listPlayers(roomId);

  await Promise.all(
    players.map((player, index) =>
      db
        .update(roomPlayers)
        .set({
          seat: index + 1,
        })
        .where(eq(roomPlayers.id, player.id)),
    ),
  );
};

const listRoundAnswers = async (roundId: string) =>
  db.query.roundAnswers.findMany({
    where: eq(roundAnswers.roundId, roundId),
  });

export const buildRoomSnapshot = async (
  roomCode: string,
  viewerId?: string,
): Promise<RoomSnapshot> => {
  const room = await getRoomByCode(roomCode);
  const players = await listPlayers(room.id);
  const currentRound = room.currentRoundId
    ? await db.query.gameRounds.findFirst({
        where: eq(gameRounds.id, room.currentRoundId),
      })
    : null;
  const answers = currentRound ? await listRoundAnswers(currentRound.id) : [];

  const userIds = players.filter((player) => player.userId).map((player) => player.userId as string);
  const userImages = new Map<string, string | null>();

  if (userIds.length > 0) {
    const users = await db
      .select({ id: authUser.id, image: authUser.image })
      .from(authUser)
      .where(inArray(authUser.id, userIds));

    users.forEach((user) => {
      userImages.set(user.id, user.image ?? null);
    });
  }

  return {
    id: room.id,
    code: room.code,
    title: room.title,
    phase: room.phase,
    roundNumber: room.roundNumber,
    sequenceLength: room.sequenceLength,
    maxPlayers: room.maxPlayers,
    hostUserId: room.hostUserId,
    winnerPlayerId: room.winnerPlayerId,
    createdAt: room.createdAt.toISOString(),
    startedAt: room.startedAt?.toISOString() ?? null,
    finishedAt: room.finishedAt?.toISOString() ?? null,
    revealEndsAt: currentRound?.revealEndsAt.toISOString() ?? null,
    answerEndsAt: currentRound?.answerEndsAt.toISOString() ?? null,
    visibleSequence: room.phase === "memorizing" ? currentRound?.sequence ?? null : null,
    players: players.map((player) => ({
      id: player.id,
      userId: player.userId,
      displayName: player.displayName,
      image: player.userId ? userImages.get(player.userId) ?? null : null,
      isBot: player.isBot,
      outcome: player.outcome,
      eliminationRound: player.eliminationRound,
      seat: player.seat,
      isCurrentUser: player.userId === viewerId,
      hasSubmitted: answers.some((answer) => answer.playerId === player.id),
    })),
    roundResults:
      room.phase === "round_result" || room.phase === "completed"
        ? answers.map((answer) => ({
            playerId: answer.playerId,
            isCorrect: answer.isCorrect,
            matchedPrefix: answer.matchedPrefix,
            mismatchIndex: answer.mismatchIndex,
            submittedSequence: answer.submittedSequence,
          }))
        : [],
  };
};

const publishRoom = async (roomCode: string) => {
  const snapshot = await buildRoomSnapshot(roomCode);
  roomEvents.publish(roomCode, snapshot);
};

export const getRecentMatches = async () => {
  const rooms = await db.query.gameRooms.findMany({
    where: sql`${gameRooms.finishedAt} is not null`,
    orderBy: [desc(gameRooms.finishedAt)],
    limit: 8,
  });

  return Promise.all(
    rooms.map(async (room) => {
      const players = await listPlayers(room.id);
      const winner = players.find((player) => player.id === room.winnerPlayerId);
      const winnerProfile = winner?.userId
        ? await db
            .select({ image: authUser.image })
            .from(authUser)
            .where(eq(authUser.id, winner.userId))
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : null;

      return {
        code: room.code,
        title: room.title,
        finishedAt: room.finishedAt?.toISOString() ?? room.createdAt.toISOString(),
        roundNumber: room.roundNumber,
        winnerName: winner?.displayName ?? "Ничья",
        winnerImage: winnerProfile?.image ?? null,
        winnerIsBot: winner?.isBot ?? false,
        players: players.map((player) => player.displayName),
      };
    }),
  );
};

export const getDashboardData = async (viewer: Viewer) => {
  const joinedRooms = await db
    .select({
      code: gameRooms.code,
      title: gameRooms.title,
      phase: gameRooms.phase,
      roundNumber: gameRooms.roundNumber,
      createdAt: gameRooms.createdAt,
    })
    .from(roomPlayers)
    .innerJoin(gameRooms, eq(gameRooms.id, roomPlayers.roomId))
    .where(and(eq(roomPlayers.userId, viewer.userId), isNull(gameRooms.finishedAt)))
    .orderBy(desc(gameRooms.createdAt));

  const publicRooms = await db.query.gameRooms.findMany({
    where: and(eq(gameRooms.phase, "lobby"), isNull(gameRooms.finishedAt)),
    orderBy: [desc(gameRooms.createdAt)],
    limit: 6,
  });

  return {
    joinedRooms: joinedRooms.map((room) => ({
      ...room,
      createdAt: room.createdAt.toISOString(),
    })),
    publicRooms: await Promise.all(
      publicRooms.map(async (room) => ({
        code: room.code,
        title: room.title,
        phase: room.phase,
        roundNumber: room.roundNumber,
        maxPlayers: room.maxPlayers,
        createdAt: room.createdAt.toISOString(),
        playerCount: (await listPlayers(room.id)).length,
      })),
    ),
    recentMatches: await getRecentMatches(),
  };
};

export const createRoom = async ({
  hostUserId,
  displayName,
  title,
  maxPlayers,
  botCount,
}: {
  hostUserId: string;
  displayName: string;
  title: string;
  maxPlayers: number;
  botCount: number;
}) => {
  const code = createCode();

  const [room] = await db
    .insert(gameRooms)
    .values({
      code,
      title,
      hostUserId,
      maxPlayers,
      sequenceLength: 3,
    })
    .returning();

  await db.insert(roomPlayers).values({
    roomId: room.id,
    userId: hostUserId,
    displayName,
    seat: 1,
  });

  if (botCount > 0) {
    await db.insert(roomPlayers).values(
      Array.from({ length: botCount }, (_, index) => ({
        roomId: room.id,
        displayName: `Бот ${index + 1}`,
        isBot: true,
        seat: index + 2,
      })),
    );
  }

  await publishRoom(code);

  return room.code;
};

export const joinRoom = async ({
  roomCode,
  userId,
  displayName,
}: {
  roomCode: string;
  userId: string;
  displayName: string;
}) => {
  const room = await getRoomByCode(roomCode);
  const existingPlayer = await getPlayerInRoom(room.id, userId);

  if (existingPlayer) {
    return room.code;
  }

  if (room.phase !== "lobby") {
    throw new Error("Присоединиться можно только к комнате в лобби");
  }

  const players = await listPlayers(room.id);

  if (players.length >= room.maxPlayers) {
    throw new Error("Комната уже заполнена");
  }

  await db.insert(roomPlayers).values({
    roomId: room.id,
    userId,
    displayName,
    seat: players.length + 1,
  });

  await publishRoom(room.code);

  return room.code;
};

export const leaveRoom = async ({
  roomCode,
  userId,
}: {
  roomCode: string;
  userId: string;
}) => {
  const room = await getRoomByCode(roomCode);

  if (room.phase !== "lobby") {
    throw new Error("Покинуть комнату можно только до старта игры");
  }

  const player = await getPlayerInRoom(room.id, userId);

  if (!player) {
    throw new Error("Игрок не найден в комнате");
  }

  if (room.hostUserId === userId) {
    const now = new Date();

    await Promise.all([
      db
        .update(roomPlayers)
        .set({ outcome: "left", eliminationRound: null })
        .where(eq(roomPlayers.roomId, room.id)),
      db
        .update(gameRooms)
        .set({
          phase: "completed",
          finishedAt: now,
          winnerPlayerId: null,
        })
        .where(eq(gameRooms.id, room.id)),
    ]);

    clearRoomTimers(room.id);
    await publishRoom(room.code);
    await db.delete(gameRooms).where(eq(gameRooms.id, room.id));
    return;
  }

  await db.delete(roomPlayers).where(eq(roomPlayers.id, player.id));
  await reseatPlayers(room.id);

  const remainingPlayers = await listPlayers(room.id);
  const remainingHumans = remainingPlayers.filter((candidate) => !candidate.isBot && candidate.userId);

  if (remainingPlayers.length === 0 || remainingHumans.length === 0) {
    await db.delete(gameRooms).where(eq(gameRooms.id, room.id));
    clearRoomTimers(room.id);
    return;
  }

  await publishRoom(room.code);
};

const ensureHost = async (roomCode: string, userId: string) => {
  const room = await getRoomByCode(roomCode);

  if (room.hostUserId !== userId) {
    throw new Error("Запускать игру может только ведущий комнаты");
  }

  return room;
};

const startRound = async (roomCode: string) => {
  const room = await getRoomByCode(roomCode);
  const activePlayers = await db.query.roomPlayers.findMany({
    where: and(eq(roomPlayers.roomId, room.id), eq(roomPlayers.outcome, "active")),
  });

  if (activePlayers.length <= 1) {
    return;
  }

  const nextRoundNumber = room.roundNumber + 1;
  const sequenceLength = nextSequenceLength(nextRoundNumber);
  const now = new Date();
  const revealEndsAt = new Date(now.getTime() + memorizationMs);
  const answerEndsAt = new Date(revealEndsAt.getTime() + answerMs);

  const [round] = await db
    .insert(gameRounds)
    .values({
      roomId: room.id,
      roundNumber: nextRoundNumber,
      sequence: createSequence(sequenceLength),
      revealStartedAt: now,
      revealEndsAt,
      answerEndsAt,
    })
    .returning();

  await db
    .update(gameRooms)
    .set({
      phase: "memorizing",
      roundNumber: nextRoundNumber,
      sequenceLength,
      currentRoundId: round.id,
      startedAt: room.startedAt ?? now,
    })
    .where(eq(gameRooms.id, room.id));

  const timers = getTimers(room.id);

  timers.reveal = setTimeout(async () => {
    await db
      .update(gameRooms)
      .set({ phase: "answering" })
      .where(eq(gameRooms.id, room.id));

    await publishRoom(room.code);
    await scheduleBots(room.id, room.code, round.id, nextRoundNumber, answerEndsAt);
  }, memorizationMs);

  timers.resolve = setTimeout(async () => {
    await settleRound(room.id, room.code);
  }, memorizationMs + answerMs);

  await publishRoom(room.code);
};

const scheduleBots = async (
  roomId: string,
  roomCode: string,
  roundId: string,
  roundNumber: number,
  answerEndsAt: Date,
) => {
  const round = await db.query.gameRounds.findFirst({
    where: eq(gameRounds.id, roundId),
  });

  if (!round) {
    return;
  }

  const activeBots = await db.query.roomPlayers.findMany({
    where: and(
      eq(roomPlayers.roomId, roomId),
      eq(roomPlayers.outcome, "active"),
      eq(roomPlayers.isBot, true),
    ),
  });

  const timers = getTimers(roomId);

  for (const bot of activeBots) {
    const timeout = setTimeout(async () => {
      await submitAnswer({
        roomCode,
        userId: null,
        botPlayerId: bot.id,
        submittedSequence: buildBotAnswer(round.sequence, roundNumber),
      });
    }, getBotDelay(answerEndsAt));

    timers.bots.push(timeout);
  }
};

const completeRoom = async ({
  roomId,
  roomCode,
  winnerPlayerId,
}: {
  roomId: string;
  roomCode: string;
  winnerPlayerId: string;
}) => {
  const now = new Date();

  await db
    .update(roomPlayers)
    .set({ outcome: "winner" })
    .where(eq(roomPlayers.id, winnerPlayerId));

  await db
    .update(gameRooms)
    .set({
      phase: "completed",
      winnerPlayerId,
      finishedAt: now,
    })
    .where(eq(gameRooms.id, roomId));

  clearRoomTimers(roomId);
  await publishRoom(roomCode);
};

const settleRound = async (roomId: string, roomCode: string) => {
  const room = await getRoomByCode(roomCode);
  if (!room.currentRoundId) {
    return;
  }

  const players = await db.query.roomPlayers.findMany({
    where: and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.outcome, "active")),
  });

  const round = await db.query.gameRounds.findFirst({
    where: eq(gameRounds.id, room.currentRoundId),
  });

  if (!round) {
    return;
  }

  const answers = await listRoundAnswers(round.id);
  const byPlayer = Object.fromEntries(
    answers.map((answer) => [answer.playerId, answer.submittedSequence]),
  ) as Record<string, Signal[]>;

  const result = resolveRound({
    activePlayerIds: players.map((player) => player.id),
    sequence: round.sequence,
    submittedAnswers: byPlayer,
  });

  if (result.eliminated.length > 0) {
    await db
      .update(roomPlayers)
      .set({
        outcome: "eliminated",
        eliminationRound: round.roundNumber,
      })
      .where(inArray(roomPlayers.id, result.eliminated));
  }

  await db
    .update(gameRounds)
    .set({ resolvedAt: new Date() })
    .where(eq(gameRounds.id, round.id));

  if (result.survivors.length === 1) {
    await completeRoom({
      roomId,
      roomCode,
      winnerPlayerId: result.survivors[0]!,
    });
    return;
  }

  await db
    .update(gameRooms)
    .set({
      phase: "round_result",
    })
    .where(eq(gameRooms.id, roomId));

  await publishRoom(roomCode);

  const timers = getTimers(roomId);
  timers.nextRound = setTimeout(async () => {
    await startRound(roomCode);
  }, betweenRoundsMs);
};

export const startGame = async ({ roomCode, userId }: { roomCode: string; userId: string }) => {
  const room = await ensureHost(roomCode, userId);
  const players = await listPlayers(room.id);

  if (players.length < 2) {
    throw new Error("Для старта нужно минимум 2 участника");
  }

  if (room.phase !== "lobby") {
    throw new Error("Игра уже началась");
  }

  await startRound(roomCode);
};

export const submitAnswer = async ({
  roomCode,
  userId,
  botPlayerId,
  submittedSequence,
}: {
  roomCode: string;
  userId: string | null;
  botPlayerId?: string;
  submittedSequence: Signal[];
}) => {
  const room = await getRoomByCode(roomCode);

  if (room.phase !== "answering" || !room.currentRoundId) {
    throw new Error("Сейчас нет активного этапа ответа");
  }

  const round = await db.query.gameRounds.findFirst({
    where: eq(gameRounds.id, room.currentRoundId),
  });

  if (!round) {
    throw new Error("Раунд не найден");
  }

  const player = botPlayerId
    ? await db.query.roomPlayers.findFirst({
        where: eq(roomPlayers.id, botPlayerId),
      })
    : await db.query.roomPlayers.findFirst({
        where: and(eq(roomPlayers.roomId, room.id), eq(roomPlayers.userId, userId!)),
      });

  if (!player || player.outcome !== "active") {
    throw new Error("Игрок не найден или уже выбыл");
  }

  const existing = await db.query.roundAnswers.findFirst({
    where: and(eq(roundAnswers.roundId, round.id), eq(roundAnswers.playerId, player.id)),
  });

  if (existing) {
    throw new Error("Ответ уже отправлен");
  }

  const evaluation = resolveRound({
    activePlayerIds: [player.id],
    sequence: round.sequence,
    submittedAnswers: {
      [player.id]: submittedSequence,
    },
  }).evaluations[0]!;

  await db.insert(roundAnswers).values({
    roundId: round.id,
    playerId: player.id,
    submittedSequence,
    isCorrect: evaluation.isCorrect,
    matchedPrefix: evaluation.matchedPrefix,
    mismatchIndex: evaluation.mismatchIndex,
  });

  await publishRoom(room.code);

  const activePlayers = await db.query.roomPlayers.findMany({
    where: and(eq(roomPlayers.roomId, room.id), eq(roomPlayers.outcome, "active")),
  });
  const answers = await listRoundAnswers(round.id);

  if (answers.length >= activePlayers.length) {
    const timers = getTimers(room.id);
    if (timers.resolve) {
      clearTimeout(timers.resolve);
    }
    await settleRound(room.id, room.code);
  }
};
