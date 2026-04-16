export interface TRPCContext {
  session: Awaited<ReturnType<typeof import("@/lib/auth").auth.api.getSession>> | null;
  headers: Headers;
}
