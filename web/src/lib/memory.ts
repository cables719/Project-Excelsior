import { google } from 'googleapis';
import { getAuth } from './data';
import { Message } from './types';

export type StoredMessage = {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
};

// We use a specific tab for memory
const SHEET_RANGE = 'Memory!A:C';

async function getSheets(sheetIdOverride?: string) {
    const { auth, sheetId } = await getAuth(sheetIdOverride);
    if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID'); // Can't read memory without ID
    return {
        sheets: google.sheets({ version: 'v4', auth }),
        sheetId
    };
}

export async function getRecentHistory(limit: number = 20, sheetIdOverride?: string): Promise<StoredMessage[]> {
    try {
        const { sheets, sheetId } = await getSheets(sheetIdOverride);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: SHEET_RANGE,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        // Skip header if it exists (assuming Row 1 is header)
        // We can just parse all and sort/slice
        // Format: [Timestamp, Role, Content]
        const history: StoredMessage[] = rows
            .map(row => ({
                timestamp: Number(row[0]),
                role: row[1] as 'user' | 'assistant',
                content: row[2]
            }))
            .filter(m => m.timestamp && m.content); // basic validation

        return history.slice(-limit);
    } catch (error) {
        console.error('Error reading memory from Sheets:', error);
        // Fallback or empty if sheet doesn't exist yet
        return [];
    }
}

export async function appendExchange(userContent: string, assistantContent: string, sheetIdOverride?: string) {
    try {
        const { sheets, sheetId } = await getSheets(sheetIdOverride);
        const now = Date.now();

        const values = [
            [now.toString(), 'user', userContent],
            [now.toString(), 'assistant', assistantContent]
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: SHEET_RANGE,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values },
        });

    } catch (error) {
        console.error('Error appending memory to Sheets:', error);
    }
}
