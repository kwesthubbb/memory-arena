import { beforeEach, describe, expect, it, vi } from "vitest";

import { gameRooms, gameRounds, roundAnswers } from "@/db/game-schema";

const getMockDb = () => (globalThis as any).__mockDb;
const getMockRoomEvents = () => (globalThis as any).__mockRoomEvents;

vi.mock("@/db", () => {
  const mockDb = {
    query: {
      gameRooms: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      roomPlayers: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      gameRounds: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      roundAnswers: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn((table: unknown) => {
      const values = vi.fn((values: unknown) => {
        const result = {
          returning: vi.fn(async () => []),
          then: (onFulfilled: (value: unknown) => unknown, onRejected?: (error: unknown) => unknown) =>
            Promise.resolve(undefined).then(onFulfilled, onRejected),
        };
        return result;
      });

      return { values };
    }),
    update: vi.fn(() => {
      const set = vi.fn(() => {
        const result = {
          where: vi.fn(async () => undefined),
          then: (onFulfilled: (value: unknown) => unknown, onRejected?: (error: unknown) => unknown) =>
            Promise.resolve(undefined).then(onFulfilled, onRejected),
        };
        return result;
      });

      return { set };
    }),
    delete: vi.fn(() => {
      const where = vi.fn(async () => undefined);
      return { where };
    }),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),
          then: (onFulfilled: (value: unknown) => unknown, onRejected?: (error: unknown) => unknown) =>
            Promise.resolve([]).then(onFulfilled, onRejected),
        })),
      })),
    })),
  };

  (globalThis as any).__mockDb = mockDb;
  return { db: mockDb };
});

vi.mock("@/server/game/events", () => {
  const roomEvents = {
    publish: vi.fn(),
  };

  (globalThis as any).__mockRoomEvents = roomEvents;
  return { roomEvents };
});

const mockDb = getMockDb();
const mockRoomEvents = getMockRoomEvents();

import {
  buildRoomSnapshot,
  createRoom,
  joinRoom,
  leaveRoom,
  getRecentMatches,
  getDashboardData,
  startGame,
  submitAnswer,
} from "@/server/game/service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("game service", () => {
  it("строит снимок комнаты с ответами и статусом отправки", async () => {
    const room = {
      id: "room-1",
      code: "ABCD12",
      title: "Test room",
      phase: "round_result",
      roundNumber: 1,
      sequenceLength: 3,
      maxPlayers: 4,
      hostUserId: "user-1",
      winnerPlayerId: null,
      createdAt: new Date(),
      startedAt: new Date(),
      finishedAt: null,
      currentRoundId: "round-1",
    };

    const players = [
      {
        id: "player-1",
        roomId: room.id,
        userId: "user-1",
        displayName: "Host",
        isBot: false,
        outcome: "active",
        eliminationRound: null,
        seat: 1,
      },
      {
        id: "player-2",
        roomId: room.id,
        userId: null,
        displayName: "Бот 1",
        isBot: true,
        outcome: "active",
        eliminationRound: null,
        seat: 2,
      },
    ];

    const round = {
      id: "round-1",
      roomId: room.id,
      roundNumber: 1,
      sequence: ["sun", "wave", "mint"],
      revealStartedAt: new Date(),
      revealEndsAt: new Date(Date.now() + 3000),
      answerEndsAt: new Date(Date.now() + 18000),
    };

    const answers = [
      {
        id: "answer-1",
        roundId: round.id,
        playerId: "player-1",
        submittedSequence: ["sun", "wave", "mint"],
        isCorrect: true,
        matchedPrefix: 3,
        mismatchIndex: null,
      },
    ];

    mockDb.query.gameRooms.findFirst.mockResolvedValue(room);
    mockDb.query.roomPlayers.findMany.mockResolvedValue(players);
    mockDb.query.gameRounds.findFirst.mockResolvedValue(round);
    mockDb.query.roundAnswers.findMany.mockResolvedValue(answers);
    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          { id: "user-1", image: "https://example.com/avatar.png" },
        ]),
      })),
    });

    const snapshot = await buildRoomSnapshot(room.code, "user-1");

    expect(snapshot.code).toBe(room.code);
    expect(snapshot.visibleSequence).toBeNull();
    expect(snapshot.players[0]!.hasSubmitted).toBe(true);
    expect(snapshot.players[1]!.hasSubmitted).toBe(false);
    expect(snapshot.roundResults).toEqual([
      {
        playerId: "player-1",
        isCorrect: true,
        matchedPrefix: 3,
        mismatchIndex: null,
        submittedSequence: ["sun", "wave", "mint"],
      },
    ]);
  });

  it("создаёт комнату с ведущим, опциональными ботами и публикует снимок", async () => {
    const room = {
      id: "room-1",
      code: "ROOM01",
      title: "Demo room",
      phase: "lobby",
      roundNumber: 0,
      sequenceLength: 3,
      maxPlayers: 4,
      hostUserId: "user-1",
      winnerPlayerId: null,
      createdAt: new Date(),
      startedAt: null,
      finishedAt: null,
      currentRoundId: null,
    };

    mockDb.insert.mockImplementation((table: unknown) => {
      const values = vi.fn((values: unknown) => {
        const result = {
          returning: vi.fn(async () => [room]),
          then: (onFulfilled: (value: unknown) => unknown, onRejected?: (error: unknown) => unknown) =>
            Promise.resolve(undefined).then(onFulfilled, onRejected),
        };
        return result;
      });
      return { values };
    });

    mockDb.query.roomPlayers.findMany.mockResolvedValue([
      {
        id: "player-1",
        roomId: room.id,
        userId: "user-1",
        displayName: "Host",
        image: null,
        isBot: false,
        outcome: "active",
        eliminationRound: null,
        seat: 1,
      },
      {
        id: "player-2",
        roomId: room.id,
        userId: null,
        displayName: "Бот 1",
        image: null,
        isBot: true,
        outcome: "active",
        eliminationRound: null,
        seat: 2,
      },
      {
        id: "player-3",
        roomId: room.id,
        userId: null,
        displayName: "Бот 2",
        image: null,
        isBot: true,
        outcome: "active",
        eliminationRound: null,
        seat: 3,
      },
    ]);
    mockDb.query.gameRounds.findFirst.mockResolvedValue(null);
    mockDb.query.roundAnswers.findMany.mockResolvedValue([]);
    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    });

    const result = await createRoom({
      hostUserId: "user-1",
      displayName: "Host",
      title: "Demo room",
      maxPlayers: 4,
      botCount: 2,
    });

    expect(result).toBe(room.code);
    expect(mockDb.insert).toHaveBeenCalledTimes(3);
    expect(mockRoomEvents.publish).toHaveBeenCalledTimes(1);
    expect(mockRoomEvents.publish.mock.calls[0]![1]).toHaveProperty("players");
  });

  it("не присоединяет игрока повторно, если он уже в комнате", async () => {
    const room = {
      id: "room-1",
      code: "TEST01",
      title: "Room",
      phase: "lobby",
      maxPlayers: 4,
    } as const;

    mockDb.query.gameRooms.findFirst.mockResolvedValue(room as any);
    mockDb.query.roomPlayers.findFirst.mockResolvedValue({ id: "player-1" } as any);

    const result = await joinRoom({
      roomCode: room.code,
      userId: "user-1",
      displayName: "Player",
    });

    expect(result).toBe(room.code);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("бросает ошибку, если не ведущий пытается начать игру", async () => {
    mockDb.query.gameRooms.findFirst.mockResolvedValue({ id: "room-1", hostUserId: "user-1" } as any);

    await expect(
      startGame({ roomCode: "ROOM01", userId: "other-user" }),
    ).rejects.toThrow("Запускать игру может только ведущий комнаты");
  });

  it("бросает ошибку при отправке ответа вне фазы ответа", async () => {
    mockDb.query.gameRooms.findFirst.mockResolvedValue({ phase: "memorizing", currentRoundId: "round-1" } as any);

    await expect(
      submitAnswer({ roomCode: "ROOM01", userId: "user-1", submittedSequence: ["sun"] }),
    ).rejects.toThrow("Сейчас нет активного этапа ответа");
  });

  it("перечисляет недавние матчи из завершённых комнат", async () => {
    mockDb.query.gameRooms.findMany.mockResolvedValue([
      {
        id: "room-1",
        code: "FIN1",
        title: "Finished",
        finishedAt: new Date("2026-01-01T12:00:00Z"),
        createdAt: new Date("2026-01-01T11:00:00Z"),
        roundNumber: 3,
        winnerPlayerId: "player-1",
      },
    ] as any);

    mockDb.query.roomPlayers.findMany.mockResolvedValue([
      {
        id: "player-1",
        roomId: "room-1",
        userId: "user-1",
        displayName: "Winner",
        isBot: false,
      },
    ] as any);

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ image: null }]),
          then: (onFulfilled: (value: unknown) => unknown, onRejected?: (error: unknown) => unknown) =>
            Promise.resolve([{ image: null }]).then(onFulfilled, onRejected),
        })),
      })),
    });

    const matches = await getRecentMatches();

    expect(matches).toHaveLength(1);
    expect(matches[0]!.code).toBe("FIN1");
    expect(matches[0]!.winnerName).toBe("Winner");
  });
});
