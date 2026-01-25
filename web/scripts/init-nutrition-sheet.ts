import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function initNutritionSheet() {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!sheetId || !email || !key) {
        console.error('❌ Missing credentials.');
        process.exit(1);
    }

    const auth = new google.auth.GoogleAuth({
        credentials: { client_email: email, private_key: key },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    try {
        // 1. Check if sheet exists
        const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const exists = meta.data.sheets?.some(s => s.properties?.title === 'Nutrition');

        if (exists) {
            console.log('✅ "Nutrition" sheet already exists.');
            return;
        }

        console.log('⚡ Creating "Nutrition" sheet...');

        // 2. Add Sheet
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
                requests: [{ addSheet: { properties: { title: 'Nutrition' } } }]
            }
        });

        // 3. Add Headers
        await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: 'Nutrition!A1:F1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [['Date', 'Time', 'Item Description', 'Calories', 'Protein (g)', 'Notes']]
            }
        });

        // 4. Style Headers (Bold + Frozen Row)
        // Find the sheetId of the new sheet
        const newMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const newSheet = newMeta.data.sheets?.find(s => s.properties?.title === 'Nutrition');
        const newSheetId = newSheet?.properties?.sheetId;

        if (newSheetId !== undefined) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: sheetId,
                requestBody: {
                    requests: [
                        {
                            repeatCell: {
                                range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 1 },
                                cell: { userEnteredFormat: { textFormat: { bold: true } } },
                                fields: 'userEnteredFormat.textFormat.bold'
                            }
                        },
                        {
                            updateSheetProperties: {
                                properties: { sheetId: newSheetId, gridProperties: { frozenRowCount: 1 } },
                                fields: 'gridProperties.frozenRowCount'
                            }
                        }
                    ]
                }
            });
        }

        console.log('✅ "Nutrition" sheet created and initialized.');

    } catch (err) {
        console.error('❌ Error:', err);
    }
}

initNutritionSheet();
