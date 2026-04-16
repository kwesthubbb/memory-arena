import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export const getServerSession = async () => {
  const headerStore = await headers();

  return auth.api.getSession({
    headers: headerStore,
  });
};
