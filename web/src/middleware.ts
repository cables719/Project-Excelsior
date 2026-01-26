
import { withAuth } from "next-auth/middleware";

export default withAuth({
    pages: {
        signIn: '/login',
    },
});

export const config = {
    // Protect everything inside /app EXCEPT:
    // - /login (public)
    // - /api/auth (NextAuth routes)
    // - /_next (static assets)
    // - /favicon.ico, etc.
    // Matcher: Protect root / and /onboarding and /api/data, etc.
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - login
         * - api/auth
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
    ],
};
