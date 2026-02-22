/**
 * Auth helper for E2E tests.
 * Signs a JWT token that is compatible with NextAuth's middleware.
 * Uses the 'jose' library which NextAuth uses internally.
 */
import { SignJWT } from 'jose';
import { Page, BrowserContext } from '@playwright/test';

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.E2E_NEXTAUTH_SECRET || 'test-secret-for-e2e';

/**
 * Generates a signed NextAuth-compatible JWT and injects it as a cookie.
 * This bypasses the withAuth middleware redirect to /login.
 */
export async function loginAsTestUser(context: BrowserContext) {
    const secret = new TextEncoder().encode(NEXTAUTH_SECRET);

    const token = await new SignJWT({
        name: 'Test User',
        email: 'test@example.com',
        picture: null,
        sub: 'test-user-id',
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .setJti(crypto.randomUUID())
        .sign(secret);

    // NextAuth v4 uses 'next-auth.session-token' for non-HTTPS, 
    // '__Secure-next-auth.session-token' for HTTPS
    await context.addCookies([
        {
            name: 'next-auth.session-token',
            value: token,
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
        },
    ]);
}
