"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";
import { authClient } from "@/lib/auth-client";
import { homeText, phaseLabels, roomNameIdeas } from "@/lib/ui-text";
import { getRoomActionError } from "@/lib/user-facing-errors";
import { formatDateTime, getAvatarGradient, getAvatarUrl, getInitials } from "@/lib/utils";
import { trpc } from "@/trpc/client";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface DashboardData {
  joinedRooms: Array<{
    code: string;
    title: string;
    phase: string;
    roundNumber: number;
    createdAt: string;
  }>;
  publicRooms: Array<{
    code: string;
    title: string;
    phase: string;
    roundNumber: number;
    maxPlayers: number;
    createdAt: string;
    playerCount: number;
  }>;
  recentMatches: Array<{
    code: string;
    title: string;
    finishedAt: string;
    roundNumber: number;
    winnerName: string;
    winnerImage?: string | null;
    winnerIsBot: boolean;
    players: string[];
  }>;
}

export function HomeShell({
  session,
  dashboard: initialDashboard,
  recentMatches: initialRecentMatches,
}: {
  session: SessionUser | null;
  dashboard: DashboardData | null;
  recentMatches: DashboardData["recentMatches"];
}) {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [title, setTitle] = useState("Память на выбывание");
  const [maxPlayers, setMaxPlayers] = useState("4");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(session?.image ?? null);
  const [botCount, setBotCount] = useState("1");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const dashboardQuery = trpc.room.dashboard.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 3000,
  });

  const dashboard = dashboardQuery.data ?? initialDashboard;
  const recentMatches = dashboard?.recentMatches ?? initialRecentMatches;


  useEffect(() => {
    const id = window.setTimeout(() => {
      setAvatarUrl(session?.image ? getAvatarUrl(session.image) : null);
    });

    return () => {
      window.clearTimeout(id);
    };
  }, [session?.image]);

  const utils = trpc.useUtils();

  const createRoomMutation = trpc.room.create.useMutation({
    onSuccess: ({ roomCode: nextCode }, { title, maxPlayers, botCount }) => {
      const newRoom = {
        code: nextCode,
        title,
        phase: "lobby" as const,
        roundNumber: 1,
        maxPlayers,
        createdAt: new Date().toISOString(),
        playerCount: 1 + botCount,
      };

      const newJoinedRoom = {
        code: nextCode,
        title,
        phase: "lobby" as const,
        roundNumber: 1,
        createdAt: new Date().toISOString(),
      };

      utils.room.dashboard.setData(undefined, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          joinedRooms: [newJoinedRoom, ...prev.joinedRooms],
          publicRooms: [newRoom, ...prev.publicRooms].slice(0, 6),
        };
      });

      router.push(`/rooms/${nextCode}`);
    },
    onError: (error) => setActionError(getRoomActionError(error.message)),
  });

  const joinRoomMutation = trpc.room.join.useMutation({
    onSuccess: ({ roomCode: nextCode }) => {
      utils.room.dashboard.invalidate();
      router.push(`/rooms/${nextCode}`);
    },
    onError: (error) => setActionError(getRoomActionError(error.message)),
  });

  const handleLogout = async () => {
    await authClient.signOut();

    router.refresh();
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        {session ? (
          <div className={styles.profileFloat}>
            <button
              className={styles.profileMenuButton}
              type="button"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
            >
              <div
                className={styles.avatarSmall}
                style={{ background: avatarUrl ? undefined : getAvatarGradient(session.name) }}
              >
                {avatarUrl ? (
                  <Image className={styles.avatarImg} src={avatarUrl} alt={session.name} width={42} height={42} unoptimized />
                ) : (
                  getInitials(session.name)
                )}
              </div>
            </button>

            {isProfileMenuOpen ? (
              <div className={styles.profileMenu}>
                <Link
                  className={styles.profileMenuItem}
                  href="/profile"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  Настройки аккаунта
                </Link>
                <button
                  className={styles.profileMenuItem}
                  type="button"
                  onClick={async () => {
                    setIsProfileMenuOpen(false);
                    await authClient.signOut();
                    router.refresh();
                  }}
                >
                  Выйти
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <section className={`${styles.hero} ${session ? styles.heroSingle : ""}`}>
          <article className={styles.heroCard}>
            <p className={styles.eyebrow}>{homeText.eyebrow}</p>
            <h1 className={styles.headline}>{homeText.title}</h1>
            <p className={styles.subtext}>{homeText.subtitle}</p>
            <div className={styles.heroGrid}>
              {homeText.metrics.map((metric) => (
                <div className={styles.metric} key={metric.title}>
                  <strong>{metric.title}</strong>
                  <span>{metric.description}</span>
                </div>
              ))}
            </div>
          </article>

          {!session ? <AuthPanel session={session} onLogout={handleLogout} /> : null}
        </section>

        {session && dashboard ? (
          <section className={styles.dashboard}>
            <div className={styles.stack}>
              <article className={styles.panel}>
                <h2 className={styles.panelTitle}>Создать новую комнату</h2>
                <p className={styles.panelText} style={{ marginBottom: 18 }}>
                  Настройте параметры игры и пригласите друзей по коду комнаты.
                </p>

                <div className={styles.form}>
                  <input
                    className={styles.input}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Название комнаты"
                  />
                  <div className={styles.hintRow}>
                    {roomNameIdeas.map((idea) => (
                      <button
                        className={styles.hintChip}
                        key={idea}
                        onClick={() => setTitle(idea)}
                        type="button"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                  <select
                    className={styles.select}
                    value={maxPlayers}
                    onChange={(event) => setMaxPlayers(event.target.value)}
                  >
                    <option value="2">2 участника</option>
                    <option value="3">3 участника</option>
                    <option value="4">4 участника</option>
                    <option value="5">5 участников</option>
                    <option value="6">6 участников</option>
                  </select>
                  <select
                    className={styles.select}
                    value={botCount}
                    onChange={(event) => setBotCount(event.target.value)}
                  >
                    <option value="0">Без ботов</option>
                    <option value="1">1 бот</option>
                    <option value="2">2 бота</option>
                    <option value="3">3 бота</option>
                    <option value="4">4 бота</option>
                    <option value="5">5 ботов</option>
                  </select>
                  <div className={styles.buttonRow}>
                    <button
                      className={styles.buttonPrimary}
                      type="button"
                      onClick={() => {
                        const trimmedTitle = title.trim();
                        setActionError(null);

                        if (trimmedTitle.length < 3) {
                          setActionError("Введите название комнаты длиной хотя бы 3 символа.");
                          return;
                        }

                        if (Number(botCount) > Number(maxPlayers) - 1) {
                          setActionError("Ботов не может быть больше, чем свободных мест в комнате.");
                          return;
                        }

                        createRoomMutation.mutate({
                          title: trimmedTitle,
                          maxPlayers: Number(maxPlayers),
                          botCount: Number(botCount),
                        });
                      }}
                    >
                      <Plus size={16} />
                      Создать комнату
                    </button>
                  </div>
                </div>
              </article>

              <article className={styles.panel}>
                <h2 className={styles.panelTitle}>Войти по коду комнаты</h2>
                <p className={styles.panelText}>
                  Если ведущий уже создал комнату, можно просто ввести код и сразу перейти в лобби.
                </p>
                <div className={styles.form} style={{ marginTop: 18 }}>
                  <input
                    className={styles.input}
                    value={roomCode}
                    onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                    placeholder="Например, A1B2C3"
                  />
                  <div className={styles.buttonRow}>
                    <button
                      className={styles.buttonSecondary}
                      type="button"
                      onClick={() => {
                        const trimmedRoomCode = roomCode.trim().toUpperCase();
                        setActionError(null);

                        if (trimmedRoomCode.length < 4) {
                          setActionError("Введите код комнаты.");
                          return;
                        }

                        joinRoomMutation.mutate({
                          roomCode: trimmedRoomCode,
                        });
                      }}
                    >
                      Присоединиться
                    </button>
                  </div>
                  {actionError ? <p className={styles.error}>{actionError}</p> : null}
                </div>
              </article>
            </div>

            <div className={styles.stack}>
              <article className={styles.panel}>
                <h2 className={styles.panelTitle}>Мои активные комнаты</h2>
                <div className={styles.roomList}>
                  {dashboard.joinedRooms.length === 0 ? (
                    <div className={styles.empty}>Активных комнат пока нет.</div>
                  ) : (
                    dashboard.joinedRooms.map((room) => (
                      <div className={styles.roomCard} key={room.code}>
                        <div className={styles.rowBetween}>
                          <div className={styles.cardIdentity}>
                            <div
                              className={styles.avatarSmall}
                              style={{ background: getAvatarGradient(room.title) }}
                            >
                              {getInitials(room.title)}
                            </div>
                            <div>
                              <h3 className={styles.roomTitle}>{room.title}</h3>
                              <p className={styles.meta}>
                              Код <span className={styles.mono}>{room.code}</span> · Раунд {room.roundNumber} ·
                              Статус: {phaseLabels[room.phase] ?? room.phase}
                              </p>
                            </div>
                          </div>
                          <button
                            className={styles.buttonGhost}
                            onClick={() => router.push(`/rooms/${room.code}`)}
                            type="button"
                          >
                            Открыть
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className={styles.panel}>
                <h2 className={styles.panelTitle}>Открытые комнаты</h2>
                <div className={styles.roomList}>
                  {dashboard.publicRooms.length === 0 ? (
                    <div className={styles.empty}>Свободных комнат сейчас нет.</div>
                  ) : (
                    dashboard.publicRooms.map((room) => (
                      <div className={styles.roomCard} key={room.code}>
                        <div className={styles.rowBetween}>
                          <div className={styles.cardIdentity}>
                            <div
                              className={styles.avatarSmall}
                              style={{ background: getAvatarGradient(room.title) }}
                            >
                              {getInitials(room.title)}
                            </div>
                            <div>
                              <h3 className={styles.roomTitle}>{room.title}</h3>
                              <p className={styles.meta}>
                              {room.playerCount}/{room.maxPlayers} участников · Код{" "}
                              <span className={styles.mono}>{room.code}</span>
                              </p>
                            </div>
                          </div>
                          <button
                            className={styles.buttonGhost}
                            onClick={() => {
                              setActionError(null);
                              joinRoomMutation.mutate({
                                roomCode: room.code,
                              });
                            }}
                            type="button"
                          >
                            Войти
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>История завершённых матчей</h2>
          <div className={styles.matchList}>
            {recentMatches.map((match) => (
              <div className={styles.matchCard} key={`${match.code}-${match.finishedAt}`}>
                <div className={styles.rowBetween}>
                  <div className={styles.cardIdentity}>
                    <div
                      className={styles.avatarSmall}
                      style={{
                        background: match.winnerImage
                          ? undefined
                          : getAvatarGradient(match.winnerName),
                      }}
                    >
                      {match.winnerIsBot ? (
                        "🤖"
                      ) : match.winnerImage ? (
                        <Image
                          className={styles.avatarImg}
                          src={match.winnerImage}
                          alt={match.winnerName}
                          width={42}
                          height={42}
                          unoptimized
                        />
                      ) : (
                        getInitials(match.winnerName)
                      )}
                    </div>
                    <div>
                      <h3 className={styles.roomTitle}>{match.title}</h3>
                      <p className={styles.meta}>
                      Победитель: {match.winnerName} · Раундов: {match.roundNumber} · Завершено:{" "}
                      {formatDateTime(match.finishedAt)}
                      </p>
                    </div>
                  </div>
                  <span className={styles.tinyBadge}>{match.players.join(" · ")}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
