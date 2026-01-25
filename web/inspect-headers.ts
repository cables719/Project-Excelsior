import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspectFirstFewRows() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    const ranges = ['Weigh-ins!A1:Z5', 'Lifts!A1:Z5'];
    const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges,
    });

    const [weighIns, lifts] = response.data.valueRanges || [];

    console.log('WEIGH-INS (First 5 rows):');
    weighIns?.values?.forEach((row, i) => console.log(`Row ${i + 1}:`, JSON.stringify(row)));

    console.log('\nLIFTS (First 5 rows):');
    lifts?.values?.forEach((row, i) => console.log(`Row ${i + 1}:`, JSON.stringify(row)));
}

inspectFirstFewRows();
