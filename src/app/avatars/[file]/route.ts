import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";

export const dynamic = "force-dynamic";

const isSafeId = (value: string) => /^[a-zA-Z0-9_-]{1,128}$/.test(value);

const parseUserId = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dot = trimmed.indexOf(".");
  const id = dot === -1 ? trimmed : trimmed.slice(0, dot);
  return isSafeId(id) ? id : null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const userId = parseUserId(file);

  if (!userId) {
    return new Response("Not found", { status: 404 });
  }

  const row = await db.query.user.findFirst({
    columns: {
      avatarData: true,
      avatarType: true,
      updatedAt: true,
    },
    where: eq(authUser.id, userId),
  });

  const bytes = row?.avatarData ?? null;
  if (!bytes) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = row?.avatarType ?? "application/octet-stream";
  const lastModified = row?.updatedAt ? new Date(row.updatedAt).toUTCString() : undefined;

  const body = Uint8Array.from(bytes).buffer;

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      ...(lastModified ? { "Last-Modified": lastModified } : {}),
    },
  });
}
