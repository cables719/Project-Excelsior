import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

import { fetchContext, DataContext } from '@/lib/data';
import { getClaraSystemPrompt } from '@/lib/persona';
import { getRecentHistory, appendExchange } from '@/lib/memory';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserConfig } from "@/lib/user-store";
import { formatDataContext } from '@/lib/format-context';

export const maxDuration = 60;

export async function POST(req: Request) {
    // console.log('[API] Chat request received');
    const { messages, clientDate, dataContext } = await req.json();

    // 1. Fetch real-time data
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return new Response('Unauthorized', { status: 401 });
    }

    const config = await getUserConfig(session.user.email);
    // If no config, we could fail or fall back.
    if (!config?.sheetId) {
        console.warn(`[API] No sheet configured for ${session.user.email}`);
    }

    let contextString = '';
    let rawData: DataContext | null = null;
    let history: any[] = [];

    try {
        if (dataContext) {
            // [OPTIMIZATION] Use client-provided context (fresh & saves API call)
            // console.log('[API] Using client-provided context.');
            rawData = dataContext;

            // [FIX] Always regenerate the string from the raw data to ensure freshness and formatting
            // This ignores the stale 'formattedString' sent by the client and rebuilds it fresh.
            contextString = formatDataContext(dataContext);

        } else if (config?.sheetId) {
            // [OPTIMIZATION] Reduced from 365 days to 7 days for fallback
            console.log('[API] Fetching context from fallback');
            rawData = await fetchContext(7, config.sheetId);
            contextString = formatDataContext(rawData);
        } else {
            // No sheet, no context.
            contextString = "[No personal data available. User has not linked a Google Sheet.]";
        }


        if (config?.sheetId) {
            // [OPTIMIZATION] Reduced from 1000 messages to 30 messages
            history = await getRecentHistory(30, config.sheetId);
        }
    } catch (error) {
        console.error('[API] Error fetching context:', error);
        contextString = '[Error fetching recent data. Proceed with caution.]';
    }

    // 2. Define Persona & Memory
    const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Clara'}: ${h.content}`).join('\n');

    const systemPrompt = `${getClaraSystemPrompt(rawData, clientDate)}

### REAL-TIME DATA
${contextString}

### RECENT INTERACTION HISTORY
(Use this to maintain continuity. If empty, this is the first session.)
${historyText}
`;

    // 3. Generate Response (Non-Streaming)
    // Switching to 2.0-flash-lite (Stable Alias) -> Using 2.5 flash as before
    try {
        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            messages: messages.map((m: any) => {
                if (m.role === 'user' && m.images && m.images.length > 0) {
                    return {
                        role: 'user',
                        content: [
                            { type: 'text', text: m.content },
                            ...m.images.map((img: string) => ({ type: 'image', image: img }))
                        ]
                    };
                }
                return { role: m.role, content: m.content };
            }),
        });

        // Log to Sheets
        const lastUserMsg = messages[messages.length - 1];
        if (lastUserMsg && lastUserMsg.role === 'user') {
            await appendExchange(lastUserMsg.content, text, config?.sheetId);
        }

        return Response.json({ role: 'assistant', content: text });
    } catch (error) {
        console.error('[API] Generation error:', error);
        return new Response(JSON.stringify({ error: 'Server Refused Connection (Quota?)' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
