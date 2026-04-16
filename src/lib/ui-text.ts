export const phaseLabels: Record<string, string> = {
  lobby: "лобби",
  memorizing: "запоминание",
  answering: "ответы",
  round_result: "итоги раунда",
  completed: "завершено",
};

export const roomNameIdeas = [
  "Вечерняя тренировка",
  "Память против скорости",
  "Кто последний ошибётся",
  "Малый турнир",
];

export const signalLabels = {
  sun: "Солнце",
  wave: "Волна",
  mint: "Мята",
  berry: "Ягода",
} as const;

export const outcomeLabels: Record<string, string> = {
  active: "в игре",
  eliminated: "выбыл",
  winner: "победитель",
  left: "покинул комнату",
};

export const homeText = {
  eyebrow: "Платформа для соревновательной тренировки памяти",
  title: "Тренируй память в игре на выбывание",
  subtitle:
    "Собирай комнату, запоминай последовательность сигналов и повторяй её точнее соперников. Ошибка выводит из игры, последний оставшийся игрок побеждает.",
  metrics: [
    {
      title: "Комнаты",
      description: "Создавай лобби, приглашай игроков и запускай матч.",
    },
    {
      title: "Раунды",
      description: "Последовательности, ответы и выбывание в каждом раунде.",
    },
    {
      title: "История",
      description: "Смотри завершённые игры, победителей и состав участников.",
    },
  ],
} as const;

export const authText = {
  alreadySignedIn: "Вы уже в системе",
  signOut: "Выйти",
  signInTab: "Вход",
  signUpTab: "Регистрация",
  namePlaceholder: "Имя игрока",
  emailPlaceholder: "Почта",
  passwordPlaceholder: "Пароль",
  passwordHint: "Пароль должен быть не короче 8 символов.",
  signInButton: "Войти",
  signUpButton: "Создать аккаунт",
  pending: "Подождите...",
} as const;

export const roomText = {
  back: "На главную",
  roomCode: "Код комнаты",
  round: "Раунд",
  waiting: "Ожидание",
  untilStage: "До этапа",
  gameArea: "Игровой экран",
  currentRoundSignals: "Сигналы текущего раунда",
  winner: "Победитель",
  startRule: "Для старта нужно минимум два участника.",
  startGame: "Начать матч",
  yourAnswer: "Ваш ответ",
  emptyAnswer: "Ответ ещё не набран",
  reset: "Сбросить",
  submit: "Отправить ответ",
  roomMembers: "Состав комнаты",
  stageResults: "Итоги текущего этапа",
  pendingResults: "Результаты появятся после завершения раунда.",
  answered: "ответил",
  active: "в игре",
  eliminated: "выбыл",
  noMistakes: "Без ошибок",
  matchedPrefix: "Совпало элементов",
  playerFallback: "Игрок",
} as const;
