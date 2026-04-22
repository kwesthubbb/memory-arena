import fs from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";

const MAX_BYTES = 5 * 1024 * 1024;

const allowedTypes = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

const getAvatarsDir = () =>
  process.env.AVATARS_DIR ?? path.resolve("public", "avatars");

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return new Response("РќСѓР¶РЅР° Р°РІС‚РѕСЂРёР·Р°С†РёСЏ", { status: 401 });
  }

  const formData = await request.formData();
  const avatar = formData.get("avatar");

  if (!avatar || !(avatar instanceof File)) {
    return new Response("РќРµ РїРµСЂРµРґР°РЅ С„Р°Р№Р» Р°РІР°С‚Р°СЂРєРё", { status: 400 });
  }

  if (avatar.size > MAX_BYTES) {
    return new Response("РЎР»РёС€РєРѕРј Р±РѕР»СЊС€РѕР№ С„Р°Р№Р». РњР°РєСЃРёРјСѓРј 5MB.", { status: 400 });
  }

  const ext = allowedTypes.get(avatar.type);
  if (!ext) {
    return new Response("Р Р°Р·СЂРµС€РµРЅС‹ С‚РѕР»СЊРєРѕ PNG/JPG/WEBP", { status: 400 });
  }

  const userId = session.user.id;
  const avatarsDir = getAvatarsDir();
  await fs.mkdir(avatarsDir, { recursive: true });

  const fileBytes = Buffer.from(await avatar.arrayBuffer());
  const fileName = `${userId}.${ext}`;
  const filePath = path.join(avatarsDir, fileName);
  await fs.writeFile(filePath, fileBytes);

  const imageUrl = `/avatars/${fileName}`;

  await db
    .update(authUser)
    .set({ image: imageUrl })
    .where(eq(authUser.id, userId));

  return Response.json({ ok: true, imageUrl });
}
