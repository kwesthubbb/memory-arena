"use client";

import { ArrowLeft, Brain, Crown, LogOut, Send, Sparkles, Timer, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";

import roomStyles from "@/app/rooms/[code]/room.module.css";
import { outcomeLabels, phaseLabels, roomText, signalLabels } from "@/lib/ui-text";
import { getGameActionError } from "@/lib/user-facing-errors";
import { getAvatarGradient, getInitials } from "@/lib/utils";
import type { RoomSnapshot, Signal } from "@/server/game/types";
import { trpc } from "@/trpc/client";

const formatTimeLeft = (end: string | null, nowMs: number) => {
  if (!end) {
    return null;
  }

  const msLeft = Date.parse(end) - nowMs;
  if (msLeft <= 0) {
    return "00:00";
  }

  const totalSeconds = Math.ceil(msLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const signalMeta: Record<
  Signal,
  {
    label: string;
    color: string;
  }
> = {
  sun: { label: signalLabels.sun, color: "var(--sun)" },
  wave: { label: signalLabels.wave, color: "var(--cyan)" },
  mint: { label: signalLabels.mint, color: "var(--mint)" },
  berry: { label: signalLabels.berry, color: "var(--berry)" },
};

export function RoomClient({
  initialRoom,
  currentUserId,
  currentUserName,
}: {
  initialRoom: RoomSnapshot;
  currentUserId: string;
  currentUserName: string;
}) {
  const [room, setRoom] = useState(initialRoom);
  const [draft, setDraft] = useState<Signal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [now, setNow] = useState<number | null>(null);

  const currentPlayer = room.players.find((player) => player.userId === currentUserId);
  const joinedPlayers = room.players.filter((player) => player.outcome !== "left");
  const availableSeats = Math.max(room.maxPlayers - joinedPlayers.length, 0);
  const isHost = room.hostUserId === currentUserId;
  const canStart = isHost && room.phase === "lobby" && joinedPlayers.length >= 2;
  const canSubmit =
    room.phase === "answering" &&
    currentPlayer &&
    currentPlayer.outcome === "active" &&
    !currentPlayer.hasSubmitted;
  const winner = room.players.find((player) => player.id === room.winnerPlayerId);

  const startMutation = trpc.room.start.useMutation({
    onError: (mutationError) => setError(getGameActionError(mutationError.message)),
  });

  const submitMutation = trpc.room.submit.useMutation({
    onSuccess: () => setDraft([]),
    onError: (mutationError) => setError(getGameActionError(mutationError.message)),
  });

  const leaveMutation = trpc.room.leave.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (mutationError) => setError(getGameActionError(mutationError.message)),
  });

  useEffect(() => {
    const source = new EventSource(`/api/rooms/${room.code}/events`);

    source.onmessage = (event) => {
      const snapshot = JSON.parse(event.data) as RoomSnapshot;
      setRoom(snapshot);
      setError(null);
    };

    source.onerror = () => {
      source.close();
    };

    return () => source.close();
  }, [room.code]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDraft([]);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [room.roundNumber, room.phase]);

  useEffect(() => {
    if (room.phase !== "memorizing" || !room.visibleSequence?.length) {
      return;
    }

    const interval = Math.max(400, Math.floor(2800 / room.visibleSequence.length));
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % room.visibleSequence!.length);
    }, interval);

    return () => clearInterval(timer);
  }, [room.phase, room.visibleSequence]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setNow(Date.now());
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (room.phase !== "memorizing" && room.phase !== "answering") {
      return;
    }

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => clearInterval(timer);
  }, [room.phase, room.revealEndsAt, room.answerEndsAt]);

  const countdown = useMemo(() => {
    const end = room.phase === "memorizing" ? room.revealEndsAt : room.answerEndsAt;
    if (!end || now === null) {
      return null;
    }

    return formatTimeLeft(end, now);
  }, [now, room.answerEndsAt, room.phase, room.revealEndsAt]);

  useEffect(() => {
    if (room.phase === "completed" && room.winnerPlayerId) {
      const timer = setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [room.phase, room.winnerPlayerId]);

  return (
    <main className={roomStyles.page}>
      <div className={roomStyles.shell}>
        <header className={roomStyles.header}>
          <div>
            <Link className={roomStyles.backLink} href="/">
              <ArrowLeft size={16} />
              {roomText.back}
            </Link>
            <p className={roomStyles.kicker}>
              {roomText.roomCode} {room.code}
            </p>
            <h1 className={roomStyles.title}>{room.title}</h1>
            <p className={roomStyles.subtitle}>
              Игрок: {currentUserName} · Фаза: {phaseLabels[room.phase] ?? room.phase}
            </p>
            {room.phase === "lobby" ? (
              <p className={roomStyles.subtitle}>
                Сейчас в лобби {joinedPlayers.length} из {room.maxPlayers} участников. Матч можно начать, когда
                соберутся хотя бы двое.
              </p>
            ) : null}
          </div>
          <div className={roomStyles.headerBadges}>
            {room.phase === "lobby" ? (
              <span className={roomStyles.badge}>
                <Users size={15} />
                {joinedPlayers.length}/{room.maxPlayers} участников
              </span>
            ) : null}
            <span className={roomStyles.badge}>
              <Brain size={15} />
              {roomText.round} {room.roundNumber}
            </span>
            <span className={roomStyles.badge}>
              <Timer size={15} />
              {countdown ? `${roomText.untilStage}: ${countdown}` : roomText.waiting}
            </span>
          </div>
        </header>

        <section className={roomStyles.grid}>
          <article className={roomStyles.stageCard}>
            <div className={roomStyles.stageHeader}>
              <div>
                <p className={roomStyles.kicker}>{roomText.gameArea}</p>
                <h2>{roomText.currentRoundSignals}</h2>
              </div>
              {winner ? (
                <span className={roomStyles.badge}>
                  <Crown size={15} />
                  {roomText.winner}: {winner.displayName}
                </span>
              ) : null}
            </div>

            {room.phase === "lobby" ? (
              <div className={roomStyles.centerMessage}>
                {!isHost || !canStart ? (
                  <p>
                    Сейчас в лобби {joinedPlayers.length} из {room.maxPlayers} участников. Матч можно начать, когда
                    соберутся хотя бы двое.
                    {availableSeats > 0 ? ` Свободных мест: ${availableSeats}.` : ""}
                  </p>
                ) : null}
                {!isHost && joinedPlayers.length >= 2 ? (
                  <p className={roomStyles.subtitle}>Ожидание ведущего комнаты. Матч начнётся, когда он нажмёт старт.</p>
                ) : null}
                {currentPlayer && isHost ? (
                  <div className={roomStyles.controls}>
                    <button
                      className={roomStyles.primaryButton}
                      disabled={!canStart || startMutation.isPending}
                      onClick={() => {
                        if (!canStart) {
                          return;
                        }

                        setError(null);
                        startMutation.mutate({
                          roomCode: room.code,
                        });
                      }}
                      type="button"
                    >
                      <Sparkles size={16} />
                      {roomText.startGame}
                    </button>
                    <button
                      className={roomStyles.ghostButton}
                      disabled={leaveMutation.isPending}
                      onClick={() => {
                        setError(null);
                        leaveMutation.mutate({
                          roomCode: room.code,
                        });
                      }}
                      type="button"
                    >
                      <LogOut size={16} />
                      Покинуть комнату
                    </button>
                  </div>
                ) : currentPlayer ? (
                  <button
                    className={roomStyles.ghostButton}
                    disabled={leaveMutation.isPending}
                    onClick={() => {
                      setError(null);
                      leaveMutation.mutate({
                        roomCode: room.code,
                      });
                    }}
                    type="button"
                  >
                    <LogOut size={16} />
                    Покинуть комнату
                  </button>
                ) : null}
              </div>
            ) : room.phase === "completed" && room.winnerPlayerId === null ? (
              <div className={roomStyles.centerMessage}>
                <p className={roomStyles.subtitle}>Лобби отменено: ведущий покинул комнату.</p>
                <Link className={roomStyles.backLink} href="/">
                  {roomText.back}
                </Link>
              </div>
            ) : (
              <>
                <div className={roomStyles.sequence}>
                  {(
                    room.visibleSequence ??
                    Array.from<Signal | null>({ length: room.sequenceLength }).fill(null)
                  ).map((signal, index) => (
                      <div
                        className={`${roomStyles.signalCard} ${
                          room.phase === "memorizing" && index === activeStep ? roomStyles.signalActive : ""
                        }`}
                        key={`${signal ?? "hidden"}-${index}`}
                        style={
                          signal
                            ? {
                                borderColor: signalMeta[signal].color,
                                background: `linear-gradient(180deg, ${signalMeta[signal].color}22, rgba(255,255,255,0.03))`,
                              }
                            : undefined
                        }
                      >
                        <span>{signal ? signalMeta[signal].label : "?"}</span>
                      </div>
                    ),
                  )}
                </div>

                <div className={roomStyles.answerPanel}>
                  <div>
                    <p className={roomStyles.kicker}>{roomText.yourAnswer}</p>
                    <div className={roomStyles.answerPreview}>
                      {draft.length === 0
                        ? roomText.emptyAnswer
                        : draft.map((item) => signalMeta[item].label).join(" · ")}
                    </div>
                  </div>
                  <div className={roomStyles.signalPad}>
                    {(
                      Object.entries(signalMeta) as Array<
                        [Signal, { label: string; color: string }]
                      >
                    ).map(([signal, meta]) => (
                      <button
                        className={roomStyles.signalButton}
                        disabled={!canSubmit || draft.length >= room.sequenceLength}
                        key={signal}
                        onClick={() => setDraft((current) => [...current, signal])}
                        style={{ borderColor: meta.color }}
                        type="button"
                      >
                        {meta.label}
                      </button>
                    ))}
                  </div>
                  <div className={roomStyles.controls}>
                    <button className={roomStyles.ghostButton} onClick={() => setDraft([])} type="button">
                      {roomText.reset}
                    </button>
                    <button
                      className={roomStyles.primaryButton}
                      disabled={!canSubmit || draft.length !== room.sequenceLength || submitMutation.isPending}
                      onClick={() => {
                        setError(null);

                        if (draft.length !== room.sequenceLength) {
                          setError(`Нужно выбрать ${room.sequenceLength} сигналов.`);
                          return;
                        }

                        submitMutation.mutate({
                          roomCode: room.code,
                          sequence: draft,
                        });
                      }}
                      type="button"
                    >
                      <Send size={16} />
                      {roomText.submit}
                    </button>
                  </div>
                </div>
              </>
            )}

            {error ? <p className={roomStyles.error}>{error}</p> : null}
          </article>

          <aside className={roomStyles.sidebar}>
            <article className={roomStyles.sideCard}>
              <p className={roomStyles.kicker}>{roomText.roomMembers}</p>
              <div className={roomStyles.playerList}>
                {joinedPlayers.map((player) => {
                  const statusLabel = player.id === room.winnerPlayerId
                    ? roomText.winner.toLowerCase()
                    : player.hasSubmitted
                      ? roomText.answered
                      : player.outcome === "active"
                        ? roomText.active
                        : roomText.eliminated;
                  const statusClass = player.id === room.winnerPlayerId
                    ? roomStyles.tinyBadgeWinner
                    : player.hasSubmitted
                      ? roomStyles.tinyBadgeAnswered
                      : player.outcome === "active"
                        ? roomStyles.tinyBadgeActive
                        : roomStyles.tinyBadgeEliminated;

                  return (
                    <div
                      className={`${roomStyles.playerRow} ${player.id === room.winnerPlayerId ? roomStyles.playerRowWinner : ""}`}
                      key={player.id}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          className={roomStyles.playerAvatar}
                          style={{
                            background: player.image
                              ? undefined
                              : getAvatarGradient(player.displayName),
                          }}
                        >
                          {player.image ? (
                            <Image
                              className={roomStyles.avatarImg}
                              src={player.image}
                              alt={player.displayName}
                              width={44}
                              height={44}
                              unoptimized
                            />
                          ) : player.isBot ? (
                            "🤖"
                          ) : (
                            getInitials(player.displayName)
                          )}
                        </div>
                        <div>
                          <strong>{player.displayName}</strong>
                          <p>
                            {player.isBot ? "бот" : "игрок"} · {outcomeLabels[player.outcome] ?? player.outcome}
                          </p>
                        </div>
                      </div>
                      <span className={`${roomStyles.tinyBadge} ${statusClass}`}>{statusLabel}</span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className={roomStyles.sideCard}>
              <p className={roomStyles.kicker}>{roomText.stageResults}</p>
              {room.roundResults.length === 0 ? (
                <p className={roomStyles.muted}>{roomText.pendingResults}</p>
              ) : (
                <div className={roomStyles.resultList}>
                  {room.roundResults.map((result) => {
                    const player = room.players.find((item) => item.id === result.playerId);
                    return (
                      <div
                        className={`${roomStyles.resultRow} ${
                          result.isCorrect ? roomStyles.resultRowCorrect : roomStyles.resultRowIncorrect
                        }`}
                        key={result.playerId}
                      >
                        <strong>{player?.displayName ?? roomText.playerFallback}</strong>
                        <p>
                          {result.isCorrect
                            ? roomText.noMistakes
                            : `${roomText.matchedPrefix}: ${result.matchedPrefix}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
