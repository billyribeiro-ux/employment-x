import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';

import { prisma } from '@/lib/server/db';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      organizationId: string | null;
      orgRole: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId: string | null;
    orgRole: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId: string | null;
    orgRole: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            memberships: { take: 1, orderBy: { createdAt: 'desc' } },
          },
        });

        if (!user) return null;

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        const membership = user.memberships[0] ?? null;

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
          orgRole: membership?.role ?? null,
        };
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  pages: {
    signIn: '/auth/login',
    newUser: '/auth/register',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.orgRole = user.orgRole;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        firstName: token.firstName,
        lastName: token.lastName,
        role: token.role,
        organizationId: token.organizationId,
        orgRole: token.orgRole,
      };
      return session;
    },
  },
};
