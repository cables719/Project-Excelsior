
import { appendFeedback } from '@/lib/data';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserConfig } from "@/lib/user-store";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return new Response('Unauthorized', { status: 401 });
        }

        const { feedback } = await req.json();
        if (!feedback) return new Response('Missing feedback', { status: 400 });

        const config = await getUserConfig(session.user.email);
        if (!config?.sheetId) {
            return new Response('No sheet configured', { status: 400 });
        }

        const fullContent = `[${session.user.email}] ${feedback}`;
        await appendFeedback(fullContent, config.sheetId);

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('Feedback Error:', e);
        return new Response('Internal Error', { status: 500 });
    }
}
