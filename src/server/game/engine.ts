import { signals, type AnswerEvaluation, type Signal } from "@/server/game/types";

export const createCode = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

export const nextSequenceLength = (roundNumber: number) =>
  Math.min(3 + Math.max(roundNumber - 1, 0), 10);

export const createSequence = (length: number, random = Math.random): Signal[] =>
  Array.from({ length }, () => signals[Math.floor(random() * signals.length)]!);

export const evaluateAnswer = (
  sequence: Signal[],
  submittedSequence: Signal[],
): Omit<AnswerEvaluation, "playerId"> => {
  const mismatchIndex = sequence.findIndex(
    (signal, index) => submittedSequence[index] !== signal,
  );

  if (mismatchIndex === -1 && submittedSequence.length === sequence.length) {
    return {
      isCorrect: true,
      matchedPrefix: sequence.length,
      mismatchIndex: null,
      submittedSequence,
    };
  }

  const firstMismatch =
    mismatchIndex === -1 ? Math.min(submittedSequence.length, sequence.length) : mismatchIndex;

  return {
    isCorrect: false,
    matchedPrefix: firstMismatch,
    mismatchIndex: firstMismatch,
    submittedSequence,
  };
};

interface ResolveRoundInput {
  activePlayerIds: string[];
  sequence: Signal[];
  submittedAnswers: Record<string, Signal[] | undefined>;
}

export const resolveRound = ({
  activePlayerIds,
  sequence,
  submittedAnswers,
}: ResolveRoundInput) => {
  const evaluations: AnswerEvaluation[] = activePlayerIds.map((playerId) => {
    const submittedSequence = submittedAnswers[playerId] ?? [];
    const result = evaluateAnswer(sequence, submittedSequence);

    return {
      playerId,
      ...result,
    };
  });

  const correctPlayers = evaluations
    .filter((evaluation) => evaluation.isCorrect)
    .map((evaluation) => evaluation.playerId);

  const survivors =
    correctPlayers.length > 0
      ? correctPlayers
      : evaluations
          .filter((evaluation) => {
            const maxPrefix = Math.max(...evaluations.map((item) => item.matchedPrefix));
            return evaluation.matchedPrefix === maxPrefix;
          })
          .map((evaluation) => evaluation.playerId);

  if (correctPlayers.length === 0 && survivors.length > 1) {
    const maxPrefix = Math.max(...evaluations.map((item) => item.matchedPrefix));
    if (maxPrefix === 0) {
      survivors.splice(1);
    }
  }

  const eliminated = activePlayerIds.filter((playerId) => !survivors.includes(playerId));

  return {
    evaluations,
    survivors,
    eliminated,
  };
};
