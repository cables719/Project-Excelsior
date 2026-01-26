import { google } from 'googleapis';
import { DataContext, WeighIn, Lift, Cardio, Nutrition, UserProfile } from './types';
export type { DataContext, WeighIn, Lift, Cardio, Nutrition, UserProfile };
import { DataCache } from './cache';
import { getUserConfig } from './user-store';

// Config
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Auth Helper
export async function getAuth(sheetIdOverride?: string) {
    const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');

    // Resolve Sheet ID: Override -> Env Var -> Cookie (via getUserConfig)
    let sheetId = sheetIdOverride || process.env.GOOGLE_SHEET_ID;

    if (!sheetId) {
        // Try getting from cookie/store
        const config = await getUserConfig('placeholder-email'); // Cookie check ignores email
        sheetId = config?.sheetId;
    }

    if (!email || !key || !sheetId) {
        // We don't throw for missing SheetID yet because some callers might not need it immediately,
        // but for getAuth we usually need it to be defined if we wanted to scope it? 
        // Actually GoogleAuth is mostly about creds. 
        // But the Caller usually needs the ID.
        if (!email || !key) throw new Error('Missing Google Sheets credentials in .env.local');
        // We allow returning auth client even if sheetId is missing, 
        // but the operations will fail if they don't have an ID.
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: email,
            private_key: key,
        },
        scopes: SCOPES,
    });

    return { auth, sheetId }; // Return both so caller knows the resolved ID
}

// Helper to parse the User KV tab
async function fetchUserProfile(sheets: any, sheetId: string): Promise<UserProfile | undefined> {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'User!A:B', // Key, Value
        });
        const rows = response.data.values;
        if (!rows) return undefined;

        const profile: any = {};
        rows.forEach((row: string[]) => {
            if (row[0] && row[1]) {
                const key = row[0].trim();
                const val = row[1].trim();

                // Try to parse JSON first (for objects like coachAttributes)
                if (val.startsWith('{') || val.startsWith('[')) {
                    try {
                        profile[key] = JSON.parse(val);
                        return;
                    } catch {
                        // Not JSON, fall through
                    }
                }

                // Try to parse numbers
                const num = Number(val);
                profile[key] = isNaN(num) ? val : num;
            }
        });
        return profile as UserProfile;
    } catch (e) {
        console.warn('User tab likely missing or empty:', e);
        return undefined;
    }
}

export async function updateUserProfile(profile: UserProfile, sheetIdOverride?: string): Promise<void> {
    const { auth, sheetId } = await getAuth(sheetIdOverride);
    if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID');

    const sheets = google.sheets({ version: 'v4', auth });

    // Convert object to rows [Key, Value]
    const values = Object.entries(profile).map(([k, v]) => {
        if (typeof v === 'object' && v !== null) {
            return [k, JSON.stringify(v)];
        }
        return [k, String(v)];
    });

    // Clear existing data first to prevent "ghost rows" (old keys persisting)
    await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: 'User!A:B',
    });

    // Write new data
    await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'User!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
    });

    DataCache.clear(sheetId);
}

export async function fetchContext(daysToFetch = 365, sheetIdOverride?: string): Promise<DataContext> {
    // 1. Resolve Auth & ID
    const { auth, sheetId } = await getAuth(sheetIdOverride);
    if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID');

    // 2. Try Cache
    const cached = DataCache.get(sheetId);
    if (cached) {
        // console.log('[Data] Serving from Cache');
        return cached;
    }

    const sheets = google.sheets({ version: 'v4', auth });

    // ... Fetch Logic ...

    // Improved ranges to ensure we capture enough history
    const ranges = [
        'Weigh-ins!A5:D5000', // Date, Weight, BF, Notes
        'Lifts!A4:G5000',     // Date, Lift, Sets, Reps, Weight, Vol, Notes
        'Cardio!A4:G5000',    // Date, Activity, Duration, Distance, Elevation, HR, Notes
        'Nutrition!A2:F5000', // Date, Time, Item, Cal, Prot, Notes
    ];

    const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges,
        valueRenderOption: 'FORMATTED_VALUE',
    });

    const [weighInRaw, liftsRaw, cardioRaw, nutritionRaw] = response.data.valueRanges || [];

    // 2. Parse Weigh-ins
    const allWeighIns: WeighIn[] = (weighInRaw?.values || [])
        .map(row => ({
            date: row[0] || '',
            weight: row[1] || '',
            bodyFat: row[2] || '',
            notes: row[3] || '',
        }))
        .filter(w => w.date);

    // 3. Parse Lifts
    const allLifts: Lift[] = (liftsRaw?.values || [])
        .map(row => ({
            date: row[0] || '',
            exercise: row[1] || '',
            sets: row[2] || '',
            reps: row[3] || '',
            weight: row[4] || '',
            notes: row[6] || '',
        }))
        .filter(l => l.date);

    // 4. Parse Cardio
    // Columns: Date(0), Activity(1), Duration(2), Distance(3), Elevation(4), HR(5), Notes(6)
    const allCardio: Cardio[] = (cardioRaw?.values || [])
        .map(row => ({
            date: row[0] || '',
            activity: row[1] || '',
            duration: row[2] || '',
            distance: row[3] || '',
            heartRate: row[5] || '', // Adjusted to column F
            notes: row[6] || '',     // Adjusted to column G
        }))
        .filter(c => c.date);



    // 5. Parse Nutrition
    const allNutrition: Nutrition[] = (nutritionRaw?.values || [])
        .map(row => ({
            date: row[0] || '',
            time: row[1] || '',
            item: row[2] || '',
            calories: row[3] || '',
            protein: row[4] || '',
            notes: row[5] || '',
        }))
        .filter(n => n.date);

    // Slice recent data
    const recentWeighIns = allWeighIns; // Keep all for graphing mostly
    const recentLifts = allLifts.slice(-1000);
    const recentCardio = allCardio.slice(-500);

    // 5. Fetch User Profile (Parallel-ish)
    // We do this after batchGet for simplicity, or could add to ranges but ranges are specific columns.
    // The User tab is structured differently (KV), so separate call is cleaner for now or we mix parsing logic.
    // Actually, adding to batchGet is faster. Let's do a separate call for safety if tab missing.
    const userProfile = await fetchUserProfile(sheets, sheetId);

    // 5. Format for LLM
    let formattedString = `=== RECENT DATA CONTEXT ===\n\n`;

    if (userProfile) {
        formattedString += `[USER PROFILE]\n`;
        Object.entries(userProfile).forEach(([k, v]) => {
            formattedString += `- ${k}: ${v}\n`;
        });
        formattedString += `\n`;
    }

    formattedString += `[RECENT WEIGH-INS (Last ${daysToFetch} Days)]\n`;
    recentWeighIns.slice(-daysToFetch).forEach(w => {
        const bf = w.bodyFat ? `(${w.bodyFat}% BF)` : '';
        const n = w.notes ? `| Note: ${w.notes}` : '';
        formattedString += `- ${w.date}: ${w.weight}lb ${bf} ${n}\n`;
    });

    formattedString += `\n[RECENT CARDIO]\n`;
    recentCardio.forEach(c => {
        formattedString += `- ${c.date}: ${c.activity} (${c.duration} min / ${c.distance}) ${c.heartRate ? 'HR:' + c.heartRate : ''} ${c.notes ? '| ' + c.notes : ''}\n`;
    });

    formattedString += `\n[RECENT LIFTS (Last 100 entries)]\n`;
    const liftsByDate: Record<string, string[]> = {};
    recentLifts.forEach(l => {
        if (!liftsByDate[l.date]) liftsByDate[l.date] = [];
        const note = l.notes ? `(${l.notes})` : '';
        liftsByDate[l.date].push(`${l.exercise} ${l.weight}lb (${l.sets}x${l.reps}) ${note}`);
    });

    Object.entries(liftsByDate).forEach(([date, exercises]) => {
        formattedString += `${date}:\n`;
        exercises.forEach(ex => formattedString += `  - ${ex}\n`);
    });

    const result = {
        weighIns: recentWeighIns,
        lifts: recentLifts,
        cardio: recentCardio,
        nutrition: allNutrition.slice(-200),
        userProfile,
        formattedString,
    };

    DataCache.set(sheetId, result);
    return result;
}

export async function appendWeighIn(data: WeighIn, sheetIdOverride?: string): Promise<void> {
    const { auth, sheetId } = await getAuth(sheetIdOverride);
    if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID');

    const sheets = google.sheets({ version: 'v4', auth });

    const values = [
        [data.date, data.weight, data.bodyFat, data.notes]
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Weigh-ins!A:D',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
    });

    DataCache.clear(sheetId);
}

export async function appendLift(data: Lift, sheetIdOverride?: string): Promise<void> {
    const { auth, sheetId } = await getAuth(sheetIdOverride);
    if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID');

    const sheets = google.sheets({ version: 'v4', auth });

    const vol = (Number(data.sets) * Number(data.reps) * Number(data.weight)).toString();
    const safeVol = isNaN(Number(vol)) ? '' : vol;

    const values = [
        [data.date, data.exercise, data.sets, data.reps, data.weight, safeVol, data.notes]
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Lifts!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
    });

    DataCache.clear(sheetId);
}

export async function appendCardio(data: Cardio, sheetIdOverride?: string): Promise<void> {
    const { auth, sheetId } = await getAuth(sheetIdOverride);
    if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID');

    const sheets = google.sheets({ version: 'v4', auth });

    // Format: Date, Activity, Duration, Distance, Elevation (Skip), HeartRate, Notes
    const values = [
        [data.date, data.activity, data.duration, data.distance, "", data.heartRate, data.notes]
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Cardio!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
    });

    DataCache.clear(sheetId);
}



export async function appendNutrition(data: Nutrition, sheetIdOverride?: string): Promise<void> {
    const { auth, sheetId } = await getAuth(sheetIdOverride);
    if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID');

    const sheets = google.sheets({ version: 'v4', auth });

    const values = [
        [data.date, data.time, data.item, data.calories, data.protein, data.notes]
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Nutrition!A:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
    });

    DataCache.clear(sheetId);
}
