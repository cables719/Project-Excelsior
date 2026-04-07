/**
 * GET /api/greeting-check
 *
 * Lightweight endpoint that checks whether Clara has flagged NEXT_LOGIN_START
 * in her coach notes, and clears it if found. Replaces the PING_GREETING
 * flow that previously went through /api/chat (which wastefully fetched 30
 * messages of conversation history before short-circuiting).
 *
 * Only fetches coach notes — no LLM, no history fetch.
 */
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserConfig } from '@/lib/user-store';
import { fetchCoachNotes, overwriteCoachNotes } from '@/lib/data';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return Response.json({ shouldGreet: false });
    }

    const config = await getUserConfig(session.user.email);
    if (!config?.sheetId) {
        return Response.json({ shouldGreet: false });
    }

    let notes: string[] = [];
    try {
        notes = await fetchCoachNotes(config.sheetId);
    } catch (err) {
        console.error('[greeting-check] Failed to fetch notes:', err);
        return Response.json({ shouldGreet: false });
    }

    const hasFlag = notes.some(n => n.includes('NEXT_LOGIN_START'));

    if (hasFlag) {
        // Clear the flag in the background so it doesn't re-trigger next time
        const cleaned = notes.filter(n => !n.includes('NEXT_LOGIN_START'));
        overwriteCoachNotes(cleaned, config.sheetId).catch(err =>
            console.error('[greeting-check] Failed to clear NEXT_LOGIN_START:', err)
        );
    }

    return Response.json({ shouldGreet: hasFlag });
}
