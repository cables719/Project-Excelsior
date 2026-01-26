import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

import { fetchContext, DataContext } from '@/lib/data';
import { getClaraSystemPrompt } from '@/lib/persona';
import { getRecentHistory, appendExchange } from '@/lib/memory';

export const maxDuration = 60;

export async function POST(req: Request) {
    // console.log('[API] Chat request received');
    // const start = Date.now();
    const { messages, clientDate } = await req.json();

    // 1. Fetch real-time data
    let contextString = '';
    let rawData: DataContext | null = null;
    try {
        // console.log('[API] Fetching context...');
        rawData = await fetchContext();
        // console.log(`[API] Context fetched in ${Date.now() - start}ms`);
        contextString = rawData.formattedString;
    } catch (error) {
        console.error('[API] Error fetching context:', error);
        contextString = '[Error fetching recent data. Proceed with caution.]';
    }

    // 2. Define Persona & Memory
    // Load last 10 messages for context (adjustable)
    const history = await getRecentHistory(10);
    const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Clara'}: ${h.content}`).join('\n');

    const systemPrompt = `${getClaraSystemPrompt(rawData, clientDate)}

### REAL-TIME DATA
${contextString}

### RECENT INTERACTION HISTORY
(Use this to maintain continuity. If empty, this is the first session.)
${historyText}
`;

    console.log('[API] content prepared, starting stream...');

    // 3. Stream Response
    // Switching to 2.0-flash-lite (Stable Alias)
    try {
        const result = streamText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            messages,
            onFinish: ({ text }) => {
                const lastUserMsg = messages[messages.length - 1];
                if (lastUserMsg && lastUserMsg.role === 'user') {
                    void appendExchange(lastUserMsg.content, text);
                }
            },
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('[API] Streaming error:', error);
        // Return a JSON error that the frontend can parse (though stream reader might just see text)
        // Since we are expected to return a stream, returning a JSON response might break the frontend reader 
        // unless we handle it. But standard fetch check response.ok first.
        return new Response(JSON.stringify({ error: 'Server Refused Connection (Quota?)' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
