import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "github" && profile) {
        const githubProfile = profile as {
          id?: number;
          login?: string;
          avatar_url?: string;
          html_url?: string;
        };

        // Check if the user exists in the database (they won't during initial signup)
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true },
        });

        if (existingUser) {
          // Update existing user with latest GitHub-specific fields
          await prisma.user.update({
            where: { id: user.id },
            data: {
              githubId: String(githubProfile.id || ""),
              githubUsername: githubProfile.login || "",
              githubAvatarUrl: githubProfile.avatar_url || "",
              githubProfileUrl: githubProfile.html_url || "",
            },
          });
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            githubId: true,
            githubUsername: true,
            githubAvatarUrl: true,
            githubProfileUrl: true,
            isSuperAdmin: true,
          },
        });

        if (dbUser) {
          let isSuper = dbUser.isSuperAdmin;
          if (!isSuper) {
            const firstUser = await prisma.user.findFirst({
              orderBy: { createdAt: "asc" },
              select: { id: true },
            });
            if (firstUser && firstUser.id === user.id) {
              await prisma.user.update({
                where: { id: user.id },
                data: { isSuperAdmin: true },
              });
              isSuper = true;
            }
          }

          const userAny = session.user as any;
          userAny.id = dbUser.id;
          userAny.githubId = dbUser.githubId;
          userAny.githubUsername = dbUser.githubUsername;
          userAny.githubAvatarUrl = dbUser.githubAvatarUrl;
          userAny.githubProfileUrl = dbUser.githubProfileUrl;
          userAny.isSuperAdmin = isSuper;
        }
      }
      return session;
    },
  },
  events: {
    async linkAccount({ user, account, profile }) {
      if (account.provider === "github" && profile) {
        const githubProfile = profile as {
          id?: number;
          login?: string;
          avatar_url?: string;
          html_url?: string;
        };

        // Populate custom GitHub fields for the newly created user record
        await prisma.user.update({
          where: { id: user.id },
          data: {
            githubId: String(githubProfile.id || ""),
            githubUsername: githubProfile.login || "",
            githubAvatarUrl: githubProfile.avatar_url || "",
            githubProfileUrl: githubProfile.html_url || "",
          },
        });
      }
    },
  },
  session: {
    strategy: "database",
  },
});

