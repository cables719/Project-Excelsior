import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

import { fetchContext, DataContext, fetchCoachNotes, appendCoachNote, overwriteCoachNotes, updateUserProfile } from '@/lib/data';
import { getClaraSystemPrompt } from '@/lib/persona';
import { getRecentHistory, appendExchange } from '@/lib/memory';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserConfig } from "@/lib/user-store";
import { formatDataContext } from '@/lib/format-context';

export const maxDuration = 60;

export async function POST(req: Request) {
    const { messages, clientDate, clientTime, dataContext, systemOverride } = await req.json();

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
    let coachNotes: string[] = [];

    try {
        if (dataContext) {
            // [OPTIMIZATION] Use client-provided context (fresh & saves API call)
            rawData = dataContext;

            // [FIX] Always regenerate the string from the raw data to ensure freshness and formatting
            // This ignores the stale 'formattedString' sent by the client and rebuilds it fresh.
            contextString = formatDataContext(dataContext);
        } else if (config?.sheetId) {
            // [OPTIMIZATION] Reduced from 7 days to 3 days for context limit
            rawData = await fetchContext(3, config.sheetId);
            contextString = formatDataContext(rawData);
        } else {
            // No sheet, no context.
            contextString = "[No personal data available. User has not linked a Google Sheet.]";
        }

        if (config?.sheetId) {
            // [OPTIMIZATION] Reduced from 30 messages to 10 messages
            history = await getRecentHistory(10, 0, config.sheetId);
        }

        // Fetch coach notes (Clara's personal memory)
        if (config?.sheetId) {
            coachNotes = await fetchCoachNotes(config.sheetId);
        }
    } catch (error) {
        console.error('[API] Error fetching context:', error);
        contextString = '[Error fetching recent data. Proceed with caution.]';
    }

    // 2. Define Persona & Memory
    const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Clara'}: ${h.content}`).join('\n');

    // Coach notes section (only if there are notes to keep prompt lean)
    const coachNotesSection = coachNotes.length > 0
        ? `\n### YOUR PERSONAL NOTES (Private — user cannot see these)\n${coachNotes.join('\n')}\n`
        : '';


    const systemPrompt = `${getClaraSystemPrompt(rawData, clientDate, clientTime)}

### REAL-TIME DATA
${contextString}

### RECENT INTERACTION HISTORY
(Use this to maintain continuity. If empty, this is the first session.)
${historyText}
${coachNotesSection}
${systemOverride ? `### CRITICAL OVERRIDE INSTRUCTION\n${systemOverride}\n\n` : ''}

### COACH NOTES TOOL
You can save private notes to yourself by including [COACH_NOTE: your note here] anywhere in your response.
These notes will be saved and shown to you in future conversations — the user will NOT see them.
Use this sparingly for important reminders.

If your notes are getting too long or redundant, you can completely rewrite them using this format:
<UPDATE_COACH_NOTES>
- Condensed Note 1
- Condensed Note 2
</UPDATE_COACH_NOTES>
This will DELETE all your previous notes and REPLACE them with the new list you provide. 
Do NOT save routine observations. Consistency: Before saving a note, check YOUR PERSONAL NOTES above. If similar information is already there, do not save it again.

### CONVERSATION INITIATION (PROACTIVE)
If you want to guarantee you start the conversation the NEXT time the user logs in, include \`[COACH_NOTE: NEXT_LOGIN_START]\` in your notes. The system will detect this and wake you up first next time. Only do this if you have something specific to follow up on.
`;

    // 3. Generate Response (Non-Streaming)
    // Switching to flash-lite for cost efficiency
    try {
        const { text } = await generateText({
            model: google('gemini-2.5-flash-lite'),
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

        // Parse and save coach notes (strip from visible response)
        let cleanedText = text;

        // Parse update coach notes block
        const updateRegex = /<UPDATE_COACH_NOTES>([\s\S]*?)<\/UPDATE_COACH_NOTES>/;
        const updateMatch = updateRegex.exec(cleanedText);

        let shouldOverwriteNotes = false;
        let newNotesList: string[] = [];

        if (updateMatch) {
            shouldOverwriteNotes = true;
            newNotesList = updateMatch[1]
                .split('\n')
                .map(n => n.replace(/^-\s*/, '').trim())
                .filter(n => n.length > 0);
            cleanedText = cleanedText.replace(updateRegex, '').trim();
        }

        const noteRegex = /\[COACH_NOTE:\s*(.+?)\]/g;
        const foundNotes: string[] = [];
        let match;
        while ((match = noteRegex.exec(cleanedText)) !== null) {
            foundNotes.push(match[1].trim());
        }
        cleanedText = cleanedText.replace(noteRegex, '').trim();

        // Parse blueprint updates
        const blueprintRegex = /<UPDATE_BLUEPRINT>([\s\S]*?)<\/UPDATE_BLUEPRINT>/;
        const blueprintMatch = blueprintRegex.exec(cleanedText);
        
        let shouldUpdateBlueprint = false;
        let newBlueprintText = '';

        if (blueprintMatch) {
            shouldUpdateBlueprint = true;
            newBlueprintText = blueprintMatch[1].trim();
            cleanedText = cleanedText.replace(blueprintRegex, '').trim();
        }

        // Save notes in background (don't block response)
        if (config?.sheetId) {
            const timestamp = (clientDate && clientTime) ? `${clientDate}, ${clientTime}` : undefined;
            if (shouldOverwriteNotes) {
                const finalNotes = [...newNotesList, ...foundNotes];
                overwriteCoachNotes(finalNotes, config.sheetId, timestamp).catch(err => {
                    console.error('[API] Failed to overwrite coach notes:', err);
                });
            } else if (foundNotes.length > 0) {
                Promise.all(foundNotes.map(note => appendCoachNote(note, config.sheetId, timestamp))).catch(err => {
                    console.error('[API] Failed to save coach notes:', err);
                });
            }

            if (shouldUpdateBlueprint && rawData?.userProfile) {
                rawData.userProfile.workoutBlueprint = newBlueprintText;
                updateUserProfile(rawData.userProfile, config.sheetId).catch(err => {
                    console.error('[API] Failed to update blueprint:', err);
                });
            }
        }

        // Log to Sheets
        const lastUserMsg = messages[messages.length - 1];
        if (lastUserMsg && lastUserMsg.role === 'user') {
            await appendExchange(lastUserMsg.content, cleanedText, config?.sheetId);
        }

        return Response.json({ role: 'assistant', content: cleanedText });
    } catch (error) {
        console.error('[API] Generation error:', error);
        return new Response(JSON.stringify({ error: 'Server Refused Connection (Quota?)' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
