import { describe, expect, it } from "vitest";

import {
  createSequence,
  evaluateAnswer,
  nextSequenceLength,
  resolveRound,
} from "@/server/game/engine";

describe("game engine", () => {
  it("увеличивает длину последовательности по раундам", () => {
    expect(nextSequenceLength(1)).toBe(3);
    expect(nextSequenceLength(2)).toBe(4);
    expect(nextSequenceLength(10)).toBe(10);
  });

  it("генерирует последовательность нужной длины", () => {
    expect(createSequence(5, () => 0)).toEqual([
      "sun",
      "sun",
      "sun",
      "sun",
      "sun",
    ]);
  });

  it("определяет корректный ответ", () => {
    expect(evaluateAnswer(["sun", "wave"], ["sun", "wave"])).toEqual({
      isCorrect: true,
      matchedPrefix: 2,
      mismatchIndex: null,
      submittedSequence: ["sun", "wave"],
    });
  });

  it("находит индекс ошибки", () => {
    expect(evaluateAnswer(["sun", "wave", "mint"], ["sun", "berry", "mint"])).toEqual({
      isCorrect: false,
      matchedPrefix: 1,
      mismatchIndex: 1,
      submittedSequence: ["sun", "berry", "mint"],
    });
  });

  it("считает лишний сигнал ошибкой после полного совпадения префикса", () => {
    expect(evaluateAnswer(["sun", "wave"], ["sun", "wave", "mint"])).toEqual({
      isCorrect: false,
      matchedPrefix: 2,
      mismatchIndex: 2,
      submittedSequence: ["sun", "wave", "mint"],
    });
  });

  it("оставляет в игре тех, кто дал правильный ответ", () => {
    const result = resolveRound({
      activePlayerIds: ["a", "b", "c"],
      sequence: ["sun", "wave"],
      submittedAnswers: {
        a: ["sun", "wave"],
        b: ["sun", "berry"],
        c: ["sun"],
      },
    });

    expect(result.survivors).toEqual(["a"]);
    expect(result.eliminated).toEqual(["b", "c"]);
  });

  it("использует лучший префикс как тай-брейк, если все ошиблись", () => {
    const result = resolveRound({
      activePlayerIds: ["a", "b", "c"],
      sequence: ["sun", "wave", "mint"],
      submittedAnswers: {
        a: ["sun", "wave", "berry"],
        b: ["sun", "berry", "mint"],
        c: ["berry", "wave", "mint"],
      },
    });

    expect(result.survivors).toEqual(["a"]);
    expect(result.eliminated).toEqual(["b", "c"]);
  });

  it("если никто не ответил, выживает только один", () => {
    const result = resolveRound({
      activePlayerIds: ["a", "b"],
      sequence: ["sun", "wave"],
      submittedAnswers: {},
    });

    expect(result.survivors.length).toBe(1);
    expect(result.survivors).toEqual(["a"]);
    expect(result.eliminated).toEqual(["b"]);
  });
});
