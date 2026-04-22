import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const allowedExt = new Map<string, string>([
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["webp", "image/webp"],
]);

const getAvatarsDir = () =>
  process.env.AVATARS_DIR ?? path.resolve("public", "avatars");

const isSafeFileName = (value: string) =>
  /^[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(value);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;

  if (!isSafeFileName(file)) {
    return new Response("Not found", { status: 404 });
  }

  const ext = file.split(".").pop() ?? "";
  const contentType = allowedExt.get(ext);
  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(getAvatarsDir(), file);

  try {
    const bytes = await fs.readFile(filePath);
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
