
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { saveUserConfig } from "@/lib/user-store";

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

        await saveUserConfig(session.user.email, { sheetId });

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Setup Error:', error);
        return new Response('Internal Error', { status: 500 });
    }
}
