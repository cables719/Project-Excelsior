import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testConnection() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    console.log(`Connecting to sheet ID: ${sheetId}...`);
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    console.log('SUCCESS! Connected to spreadsheet:');
    console.log(`Title: ${response.data.properties?.title}`);
  } catch (error) {
    console.error('ERROR connecting to Google Sheets:', error);
  }
}

testConnection();
