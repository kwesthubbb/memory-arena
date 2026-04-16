import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

import { auth } from "@/lib/auth";
import type { TRPCContext } from "@/server/trpc/types";

export const createTRPCContext = async ({
  req,
}: FetchCreateContextFnOptions): Promise<TRPCContext> => {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  return {
    session,
    headers: req.headers,
  };
};
