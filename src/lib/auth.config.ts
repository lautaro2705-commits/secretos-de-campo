import type { NextAuthConfig } from "next-auth";

/**
 * Base auth config — NO Prisma imports here.
 * Used by middleware (Edge Runtime) which cannot load Node.js modules.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "secretos-de-campo-dev-fallback-key-change-in-production",
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role: string }).role = token.role as string;
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  providers: [], // Providers added in auth.ts (needs Prisma/Node.js)
};
