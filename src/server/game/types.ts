export const signals = ["sun", "wave", "mint", "berry"] as const;

export type Signal = (typeof signals)[number];

export type RoomPhase =
  | "lobby"
  | "memorizing"
  | "answering"
  | "round_result"
  | "completed";

export type PlayerOutcome = "active" | "eliminated" | "winner" | "left";

export interface PlayerSnapshot {
  id: string;
  userId: string | null;
  displayName: string;
  image: string | null;
  isBot: boolean;
  outcome: PlayerOutcome;
  eliminationRound: number | null;
  seat: number;
  isCurrentUser: boolean;
  hasSubmitted: boolean;
}

export interface RoundResultSnapshot {
  playerId: string;
  isCorrect: boolean;
  matchedPrefix: number;
  mismatchIndex: number | null;
  submittedSequence: Signal[];
}

export interface RoomSnapshot {
  id: string;
  code: string;
  title: string;
  phase: RoomPhase;
  roundNumber: number;
  sequenceLength: number;
  maxPlayers: number;
  hostUserId: string;
  winnerPlayerId: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  revealEndsAt: string | null;
  answerEndsAt: string | null;
  visibleSequence: Signal[] | null;
  players: PlayerSnapshot[];
  roundResults: RoundResultSnapshot[];
}

export interface AnswerEvaluation {
  playerId: string;
  isCorrect: boolean;
  matchedPrefix: number;
  mismatchIndex: number | null;
  submittedSequence: Signal[];
}
