const includesAll = (value: string, parts: string[]) =>
  parts.every((part) => value.includes(part));

export const getFriendlyAuthError = (
  message: string,
  mode: "login" | "register",
) => {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("[body.email] invalid input") ||
    includesAll(normalized, ["email", "invalid"])
  ) {
    return "Введите корректный адрес электронной почты.";
  }

  if (
    normalized.includes("[body.password] invalid input") ||
    includesAll(normalized, ["password", "invalid"])
  ) {
    return "Пароль должен содержать не меньше 8 символов.";
  }

  if (
    normalized.includes("user already exists") ||
    normalized.includes("email already exists")
  ) {
    return "Пользователь с такой почтой уже зарегистрирован.";
  }

  if (
    normalized.includes("invalid email or password") ||
    normalized.includes("invalid password") ||
    normalized.includes("user not found")
  ) {
    return mode === "login"
      ? "Неверная почта или пароль."
      : "Не удалось выполнить регистрацию. Проверьте введённые данные.";
  }

  if (normalized.includes("too short")) {
    return "Проверьте длину введённых данных.";
  }

  return "Не удалось выполнить запрос. Проверьте введённые данные и попробуйте снова.";
};

export const getRoomActionError = (message: string) => {
  const normalized = message.toLowerCase();

  if (normalized.includes("комната не найдена")) {
    return "Комната с таким кодом не найдена.";
  }

  if (normalized.includes("комната уже заполнена")) {
    return "В этой комнате уже нет свободных мест.";
  }

  if (normalized.includes("присоединиться можно только к комнате в лобби")) {
    return "К этой комнате уже нельзя присоединиться: игра началась.";
  }

  if (normalized.includes("количество ботов превышает число свободных мест")) {
    return "Количество ботов должно быть меньше числа свободных мест.";
  }

  if (normalized.includes("unauthorized")) {
    return "Сначала войдите в аккаунт.";
  }

  return "Не удалось выполнить действие. Попробуйте ещё раз.";
};

export const getGameActionError = (message: string) => {
  const normalized = message.toLowerCase();

  if (normalized.includes("для старта нужно минимум 2 участника")) {
    return "Для старта нужно минимум два участника.";
  }

  if (normalized.includes("запускать игру может только ведущий комнаты")) {
    return "Запустить матч может только создатель комнаты.";
  }

  if (normalized.includes("игра уже началась")) {
    return "Матч уже запущен.";
  }

  if (normalized.includes("покинуть комнату можно только до старта игры")) {
    return "Покинуть комнату можно только пока матч ещё не начался.";
  }

  if (normalized.includes("игрок не найден в комнате")) {
    return "Вы уже не состоите в этой комнате.";
  }

  if (normalized.includes("сейчас нет активного этапа ответа")) {
    return "Сейчас нельзя отправить ответ.";
  }

  if (normalized.includes("игрок не найден или уже выбыл")) {
    return "Вы уже не участвуете в текущем раунде.";
  }

  if (normalized.includes("ответ уже отправлен")) {
    return "Ответ уже отправлен.";
  }

  if (normalized.includes("раунд не найден")) {
    return "Не удалось найти текущий раунд. Обновите страницу.";
  }

  if (normalized.includes("unauthorized")) {
    return "Сессия истекла. Войдите снова.";
  }

  return "Не удалось выполнить действие. Попробуйте ещё раз.";
};
