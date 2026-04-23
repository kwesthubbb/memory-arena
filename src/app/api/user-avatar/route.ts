import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";
import { auth } from "@/lib/auth";

const MAX_BYTES = 5 * 1024 * 1024;

const allowedTypes = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return new Response("Нужна авторизация", { status: 401 });
  }

  const formData = await request.formData();
  const avatar = formData.get("avatar");

  if (!avatar || !(avatar instanceof File)) {
    return new Response("Не передан файл аватарки", { status: 400 });
  }

  if (avatar.size > MAX_BYTES) {
    return new Response("Слишком большой файл. Максимум 5MB.", { status: 400 });
  }

  if (!allowedTypes.has(avatar.type)) {
    return new Response("Разрешены только PNG/JPG/WEBP", { status: 400 });
  }

  const userId = session.user.id;
  const fileBytes = Buffer.from(await avatar.arrayBuffer());

  const imageUrl = `/avatars/${userId}`;

  await db
    .update(authUser)
    .set({
      image: imageUrl,
      avatarData: fileBytes,
      avatarType: avatar.type,
    })
    .where(eq(authUser.id, userId));

  return Response.json({ ok: true, imageUrl });
}

