import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

const handler = () => toNextJsHandler(getAuth());

export const GET = (request: Request) => handler().GET(request as any);
export const POST = (request: Request) => handler().POST(request as any);
