import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roomPhaseEnum = pgEnum("room_phase", [
  "lobby",
  "memorizing",
  "answering",
  "round_result",
  "completed",
]);

export const playerOutcomeEnum = pgEnum("player_outcome", [
  "active",
  "eliminated",
  "winner",
  "left",
]);

export const signalEnum = pgEnum("signal_kind", ["sun", "wave", "mint", "berry"]);

export const gameRooms = pgTable(
  "game_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    hostUserId: text("host_user_id").notNull(),
    phase: roomPhaseEnum("phase").notNull().default("lobby"),
    maxPlayers: integer("max_players").notNull(),
    roundNumber: integer("round_number").notNull().default(0),
    sequenceLength: integer("sequence_length").notNull().default(3),
    currentRoundId: uuid("current_round_id"),
    winnerPlayerId: uuid("winner_player_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("game_rooms_code_idx").on(table.code)],
);

export const roomPlayers = pgTable(
  "room_players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => gameRooms.id, { onDelete: "cascade" }),
    userId: text("user_id"),
    displayName: text("display_name").notNull(),
    isBot: boolean("is_bot").notNull().default(false),
    seat: integer("seat").notNull(),
    outcome: playerOutcomeEnum("outcome").notNull().default("active"),
    eliminationRound: integer("elimination_round"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("room_players_room_idx").on(table.roomId),
    uniqueIndex("room_players_room_seat_idx").on(table.roomId, table.seat),
  ],
);

export const gameRounds = pgTable(
  "game_rounds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => gameRooms.id, { onDelete: "cascade" }),
    roundNumber: integer("round_number").notNull(),
    sequence: jsonb("sequence").$type<Array<"sun" | "wave" | "mint" | "berry">>().notNull(),
    revealStartedAt: timestamp("reveal_started_at", { withTimezone: true }).notNull(),
    revealEndsAt: timestamp("reveal_ends_at", { withTimezone: true }).notNull(),
    answerEndsAt: timestamp("answer_ends_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("game_rounds_room_idx").on(table.roomId),
    uniqueIndex("game_rounds_room_round_idx").on(table.roomId, table.roundNumber),
  ],
);

export const roundAnswers = pgTable(
  "round_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roundId: uuid("round_id")
      .notNull()
      .references(() => gameRounds.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => roomPlayers.id, { onDelete: "cascade" }),
    submittedSequence: jsonb("submitted_sequence")
      .$type<Array<"sun" | "wave" | "mint" | "berry">>()
      .notNull(),
    isCorrect: boolean("is_correct").notNull(),
    matchedPrefix: integer("matched_prefix").notNull(),
    mismatchIndex: integer("mismatch_index"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("round_answers_round_player_idx").on(table.roundId, table.playerId)],
);
