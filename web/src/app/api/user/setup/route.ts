
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { saveUserConfig, getCookieName } from "@/lib/user-store";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const { sheetId } = await req.json();

        // Basic validation
        if (!sheetId || typeof sheetId !== 'string') {
            return new Response('Invalid Sheet ID', { status: 400 });
        }

        const cookieName = getCookieName(session.user.email);

        // Return response with Set-Cookie header
        return new Response(JSON.stringify({ success: true }), {
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': `${cookieName}=${sheetId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=315360000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}` // 10 years
            }
        });
    } catch (error) {
        console.error('Setup Error:', error);
        return new Response('Internal Error', { status: 500 });
    }
}
