import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { normalizeLogin, pickLoginMatch } from "@/lib/account-validation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.AUTH_DISCORD_SECRET!,
      authorization: {
        params: {
          scope: "identify",
          prompt: "none",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const login = normalizeLogin(credentials?.email);

        if (
          !login ||
          typeof credentials?.password !== "string" ||
          !credentials.password
        ) {
          return null;
        }

        const candidates = await prisma.user.findMany({
          where: {
            OR: [
              { email: { equals: login, mode: "insensitive" } },
              { username: { equals: login, mode: "insensitive" } },
            ],
          },
        });

        const user = pickLoginMatch(candidates, login);

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword,
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
