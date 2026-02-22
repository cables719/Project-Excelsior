
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In E2E test mode, skip auth entirely
function middleware(req: NextRequest) {
    if (process.env.DISABLE_AUTH === 'true') {
        return NextResponse.next();
    }
    // Fall through to withAuth for normal operation
    return (withAuth({
        pages: { signIn: '/login' },
    }) as any)(req);
}

export default middleware;

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
