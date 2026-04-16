import { createSequence } from "@/server/game/engine";
import type { Signal } from "@/server/game/types";

export const buildBotAnswer = (sequence: Signal[], roundNumber: number): Signal[] => {
  const errorChance = Math.min(0.1 + roundNumber * 0.05, 0.5);
  const shouldFail = Math.random() < errorChance;

  if (!shouldFail) {
    return [...sequence];
  }

  const mistakeIndex = Math.max(0, Math.floor(Math.random() * sequence.length));
  const answer = [...sequence];
  const wrongVariant = createSequence(1).find((item) => item !== answer[mistakeIndex]);

  answer[mistakeIndex] = wrongVariant ?? "berry";

  if (Math.random() < 0.25) {
    return answer.slice(0, Math.max(1, mistakeIndex));
  }

  return answer;
};

export const getBotDelay = (answerEndsAt: Date) => {
  const msLeft = Math.max(answerEndsAt.getTime() - Date.now(), 1200);
  return Math.min(Math.max(900, Math.floor(msLeft * (0.3 + Math.random() * 0.4))), msLeft - 300);
};
