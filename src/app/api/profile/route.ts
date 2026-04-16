import { auth } from "@/lib/auth";
import { db } from "@/db";
import { account, user as authUser } from "@/db/auth-schema";
import { hashPassword, verifyPassword } from "@better-auth/utils/password";
import { and, eq } from "drizzle-orm";

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return new Response("Нужна авторизация", { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return new Response("Неверный запрос", { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : undefined;
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : undefined;

  if (!name && !email && !newPassword) {
    return new Response("Нечего обновлять", { status: 400 });
  }

  const userId = session.user.id;
  const needsCredentialAccount = Boolean(email || newPassword);
  let credentialAccount = null;

  if (needsCredentialAccount) {
    if (!currentPassword) {
      return new Response("Требуется текущий пароль для смены почты или пароля", { status: 400 });
    }

    credentialAccount = await db.query.account.findFirst({
      where: and(eq(account.userId, userId), eq(account.providerId, "credential")),
    });

    if (!credentialAccount) {
      return new Response("Учётная запись не найдена", { status: 404 });
    }

    if (!credentialAccount.password) {
      return new Response("Невозможно проверить пароль", { status: 400 });
    }

    const isValid = await verifyPassword(credentialAccount.password, currentPassword);

    if (!isValid) {
      return new Response("Неверный текущий пароль", { status: 401 });
    }
  }

  if (newPassword && newPassword.length < 8) {
    return new Response("Новый пароль должен содержать не меньше 8 символов", { status: 400 });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response("Неверный формат почты", { status: 400 });
  }

  if (name && name.length < 2) {
    return new Response("Имя должно быть не короче 2 символов", { status: 400 });
  }

  try {
    if (name) {
      await db.update(authUser).set({ name }).where(eq(authUser.id, userId));
    }

    if (email) {
      await db.update(authUser).set({ email }).where(eq(authUser.id, userId));
      await db.update(account)
        .set({ accountId: email })
        .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
    }

    if (newPassword) {
      const hashedPassword = await hashPassword(newPassword);
      await db.update(account)
        .set({ password: hashedPassword })
        .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
    }
  } catch (error) {
    const message = (error instanceof Error ? error.message : "Ошибка сервера").toString();
    return new Response(message, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return new Response("Нужна авторизация", { status: 401 });
  }

  try {
    await db.delete(authUser).where(eq(authUser.id, session.user.id));
    return Response.json({ ok: true });
  } catch (error) {
    const message = (error instanceof Error ? error.message : "Ошибка сервера").toString();
    return new Response(message, { status: 500 });
  }
}
