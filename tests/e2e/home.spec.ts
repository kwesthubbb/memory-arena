import { expect, test } from "@playwright/test";

test("главная страница показывает идею проекта и форму входа", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /тренируй память в игре на выбывание/i })).toBeVisible();
  await expect(page.getByText(/собирай комнату, запоминай последовательность сигналов/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /вход и регистрация/i })).toBeVisible();
  await expect(page.getByPlaceholder("Почта")).toBeVisible();
  await expect(page.getByPlaceholder("Пароль")).toBeVisible();
  await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
});

test("на главной странице есть история завершённых матчей и основные блоки", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Комнаты")).toBeVisible();
  await expect(page.getByText("Раунды")).toBeVisible();
  await expect(page.locator("strong").filter({ hasText: "История" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /история завершённых матчей/i })).toBeVisible();
});

test("карточка завершённого матча показывает победителя и раунд", async ({ page }) => {
  await page.goto("/");

  const winnerLabels = page.getByText(/победитель:/i);
  if (await winnerLabels.count()) {
    await expect(winnerLabels.first()).toBeVisible();
    await expect(page.getByText(/раундов:/i).first()).toBeVisible();
    await expect(page.getByText(/завершено:/i).first()).toBeVisible();
  } else {
    await expect(page.getByText(/завершённых матчей пока нет/i)).toBeVisible();
  }
});
