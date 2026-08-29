import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Use the edge-safe config (no Prisma) for route protection.
export default NextAuth(authConfig).auth;

export const config = {
  // Protect everything except Next internals, the auth API, and static assets.
  // The /api/* business routes (claude, listings, deals) self-authenticate.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|woff2?)$).*)"],
};
