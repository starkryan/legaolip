import { auth } from '@/lib/auth';

export const adminAuth = {
  ...auth,
  callbacks: {
    ...auth.callbacks,
    async jwt({ token, user }) {
      // Add role information to JWT token
      if (user) {
        token.role = user.role || 'user';
        token.isAdmin = user.email?.endsWith('@admin.goip.com') || false;
      }
      return token;
    },
    async session({ session, token }) {
      // Add role information to session
      if (token) {
        session.user.role = token.role || 'user';
        session.user.isAdmin = token.isAdmin || false;
      }
      return session;
    },
  },
};

// Admin validation helper
export function validateAdminAccess(session: any): boolean {
  return session?.user?.isAdmin === true ||
         session?.user?.role === 'admin' ||
         process.env.ADMIN_EMAILS?.includes(session?.user?.email);
}

// Middleware helper for admin routes
export function requireAdminAuth() {
  return async (request: Request) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!validateAdminAccess(session)) {
      return Response.redirect(new URL('/unauthorized', request.url));
    }

    return null; // Continue to the protected route
  };
}