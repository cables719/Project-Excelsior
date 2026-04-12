import { getRecentHistory } from '@/lib/memory';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserConfig } from "@/lib/user-store";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const config = await getUserConfig(session.user.email);
    if (!config?.sheetId) {
        return Response.json([]);
    }

    try {
        const history = await getRecentHistory(limit, offset, config.sheetId);
        
        // Convert StoredMessage to Message type
        // Use timestamp + role to ensure uniqueness since user and assistant messages are often logged at the same ms
        const messages = history.map(m => ({
            id: `${m.timestamp}-${m.role}`,
            role: m.role,
            content: m.content
        }));

        return Response.json(messages);
    } catch (error) {
        console.error('[API] History error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
