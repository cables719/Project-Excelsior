import { google } from 'googleapis';
import { DataContext, WeighIn, Lift, Cardio, Nutrition, EaglesPeakLog, UserProfile, HydrationLog, WellnessLog } from './types';
export type { DataContext, WeighIn, Lift, Cardio, Nutrition, EaglesPeakLog, UserProfile };
import { formatDataContext } from './format-context';
import { DataCache } from './cache';
import { getUserConfig } from './user-store';
import { normalizeExerciseName } from './exercise-aliases';

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

// Generic helper: append a row to any sheet, auto-creating the sheet if needed.
async function appendToSheet(
    sheetName: string,
    range: string,
    values: (string | number)[][],
    opts?: { sheetIdOverride?: string; autoCreate?: boolean; headers?: string[][] }
): Promise<void> {
    const { auth, sheetId } = await getAuth(opts?.sheetIdOverride);
    if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID');

    const sheets = google.sheets({ version: 'v4', auth });
    const fullRange = `${sheetName}!${range}`;

    const doAppend = async () => {
        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: fullRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values },
        });
    };

    if (opts?.autoCreate) {
        try {
            await doAppend();
        } catch {
            // Sheet likely doesn't exist — create it
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: sheetId,
                requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
            });
            // Add headers if provided
            if (opts.headers) {
                await sheets.spreadsheets.values.append({
                    spreadsheetId: sheetId,
                    range: `${sheetName}!A1`,
                    valueInputOption: 'RAW',
                    requestBody: { values: opts.headers },
                });
            }
            await doAppend();
        }
    } else {
        await doAppend();
    }

    DataCache.clear(sheetId);
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

export async function fetchContext(daysToFetch = 365, sheetIdOverride?: string, skipCache = false): Promise<DataContext> {
    // 1. Resolve Auth & ID
    const { auth, sheetId } = await getAuth(sheetIdOverride);
    if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID');

    // 2. Try Cache
    const cached = DataCache.get(sheetId);
    if (cached && !skipCache) {
        // console.log('[Data] Serving from Cache');
        return cached;
    }

    const sheets = google.sheets({ version: 'v4', auth });

    // ... Fetch Logic ...

    // 1. Get Sheet Metadata to check which tabs exist
    const metaCallback = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
        includeGridData: false,
    });

    const sheetTitles = (metaCallback.data.sheets || []).map(s => s.properties?.title || '');
    const hasEaglesPeak = sheetTitles.includes('Eagles Peak');
    const hasHydration = sheetTitles.includes('Hydration');
    const hasWellness = sheetTitles.includes('Wellness');

    const ranges = [
        'Weigh-ins!A2:E5000',
        'Lifts!A4:G5000',
        'Cardio!A4:G5000',
        'Nutrition!A2:F5000',
        'User!A:B', // Fetch User Profile
    ];

    // Track Indices
    let extraIndexStart = 5;
    let eaglesPeakIndex = -1;
    let hydrationIndex = -1;
    let wellnessIndex = -1;

    if (hasEaglesPeak) {
        ranges.push('Eagles Peak!A2:L5000');
        eaglesPeakIndex = extraIndexStart++;
    }
    if (hasHydration) {
        ranges.push('Hydration!A1:D5000');
        hydrationIndex = extraIndexStart++;
    }
    if (hasWellness) {
        ranges.push('Wellness!A1:D5000');
        wellnessIndex = extraIndexStart++;
    }

    // [NEW] Dynamic Fetching of Universal Sheets
    const knownSheets = ['Weigh-ins', 'Lifts', 'Cardio', 'Nutrition', 'User', 'Eagles Peak', 'Hydration', 'Wellness', 'Feedback', 'Memory'];
    // Filter out known sheets to find "Extras"
    const extraSheets = sheetTitles.filter(t => !knownSheets.includes(t));

    // Add extras to ranges
    extraSheets.forEach(sheetName => {
        ranges.push(`'${sheetName}'!A1:Z500`); // Fetch reasonable amount
    });

    const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges,
        valueRenderOption: 'FORMATTED_VALUE',
    });

    const valueRanges = response.data.valueRanges || [];

    const weighInRaw = valueRanges[0];
    const liftsRaw = valueRanges[1];
    const cardioRaw = valueRanges[2];
    const nutritionRaw = valueRanges[3];
    const userProfileRaw = valueRanges[4];

    // Optional Data
    const eaglesPeakRaw = eaglesPeakIndex !== -1 ? valueRanges[eaglesPeakIndex] : null;
    const hydrationRaw = hydrationIndex !== -1 ? valueRanges[hydrationIndex] : null;
    const wellnessRaw = wellnessIndex !== -1 ? valueRanges[wellnessIndex] : null;

    // Extract Extra Data
    const extraDataRaw = valueRanges.slice(extraIndexStart);

    // Helper to safely parse numbers
    const safeFloat = (val: string) => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? undefined : parsed;
    };

    // 2. Parse Weigh-ins
    const allWeighIns: WeighIn[] = (weighInRaw?.values || [])
        .map(row => ({
            date: row[0] || '',
            weight: row[1] || '',
            bodyFat: row[2] || '',
            notes: row[3] || '',
        }))
        .filter(w => w.date && w.date !== 'Date' && !isNaN(parseFloat(w.weight)));

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
        .filter(c => c.date && c.date !== 'Date');



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
        .filter(n => n.date && n.date !== 'Date');

    // 6. Parse User Profile
    const userProfile: UserProfile = {};
    if (userProfileRaw?.values) {
        userProfileRaw.values.forEach(row => {
            if (row[0] && row[1]) {
                const key = row[0];
                let value: any = row[1];

                // Try to parse numbers/booleans
                if (value === 'true') value = true;
                else if (value === 'false') value = false;
                else if (!isNaN(Number(value)) && value.trim() !== '') value = Number(value);
                else {
                    // Try to parse JSON if it looks like it (for nested objects like preferences)
                    if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
                        try {
                            value = JSON.parse(value);
                        } catch (e) {
                            // keep as string
                        }
                    }
                }
                userProfile[key] = value;
            }
        });
    }

    // 7. Parse Eagles Peak
    const eaglesPeakLogs: EaglesPeakLog[] = (eaglesPeakRaw?.values || [])
        .map(row => ({
            date: row[0] || '',
            ascentTime: row[1] || '',
            overallTime: row[2] || '',
            averagePace: row[3] || '',
            averageHR: row[4] || '',
            maxHR: row[5] || '',
            zone5: row[6] || '',
            zone4: row[7] || '',
            zone3: row[8] || '',
            zone2: row[9] || '',
            calories: row[10] || '',
            notes: row[11] || '',
        }))
        .filter(l => l.date);

    // 8. Parse Hydration
    const hydrationLogs: HydrationLog[] = (hydrationRaw?.values || [])
        .map(row => ({
            date: row[0] || '',
            time: row[1] || '',
            amount: row[2] || '',
            source: row[3] || '',
        }))
        .filter(h => h.date && h.date !== 'Date');

    // 9. Parse Wellness
    const wellnessLogs: WellnessLog[] = (wellnessRaw?.values || [])
        .map(row => ({
            date: row[0] || '',
            mood: row[1] || '',
            energy: row[2] || '',
            notes: row[3] || '',
        }))
        .filter(w => w.date && w.date !== 'Date');


    // Slice recent data
    const recentWeighIns = allWeighIns; // Keep all for graphing mostly
    const recentLifts = allLifts; // Keep ALL lifts for Smart History lookup
    const recentCardio = allCardio.slice(-20);



    const result: DataContext = {
        weighIns: recentWeighIns,
        lifts: recentLifts,
        cardio: recentCardio,
        nutrition: allNutrition.slice(-30), // Reduce from 100 to 30
        eaglesPeakLogs: eaglesPeakLogs.slice(-10),
        hydrationLogs,
        wellnessLogs,
        userProfile,
        formattedString: '', // Will be set below
        extraSheets
    };

    // Use shared formatter
    result.formattedString = formatDataContext(result);

    DataCache.set(sheetId, result);
    return result;
}

export async function appendWeighIn(data: WeighIn, sheetIdOverride?: string): Promise<void> {
    await appendToSheet('Weigh-ins', 'A:D', [
        [data.date, data.weight, data.bodyFat, data.notes]
    ], { sheetIdOverride });
}

export async function appendLift(data: Lift, sheetIdOverride?: string): Promise<void> {
    const normalized = normalizeExerciseName(data.exercise);
    const vol = (Number(data.sets) * Number(data.reps) * Number(data.weight)).toString();
    const safeVol = isNaN(Number(vol)) ? '' : vol;
    await appendToSheet('Lifts', 'A:G', [
        [data.date, normalized, data.sets, data.reps, data.weight, safeVol, data.notes]
    ], { sheetIdOverride });
}

export async function appendCardio(data: Cardio, sheetIdOverride?: string): Promise<void> {
    await appendToSheet('Cardio', 'A:G', [
        [data.date, data.activity, data.duration, data.distance, '', data.heartRate, data.notes]
    ], { sheetIdOverride });
}

export async function appendNutrition(data: Nutrition, sheetIdOverride?: string): Promise<void> {
    await appendToSheet('Nutrition', 'A:F', [
        [data.date, data.time, data.item, data.calories, data.protein, data.notes]
    ], { sheetIdOverride });
}

export async function appendFeedback(content: string, sheetIdOverride?: string): Promise<void> {
    const date = new Date().toLocaleString('en-US');
    await appendToSheet('Feedback', 'A:B', [
        [date, content]
    ], { sheetIdOverride, autoCreate: true });
}

export async function appendEaglesPeakLog(data: EaglesPeakLog, sheetIdOverride?: string): Promise<void> {
    await appendToSheet('Eagles Peak', 'A:L', [
        [data.date, data.ascentTime, data.overallTime, data.averagePace, data.averageHR, data.maxHR, data.zone5, data.zone4, data.zone3, data.zone2, data.calories, data.notes]
    ], { sheetIdOverride, autoCreate: true });
}

export async function appendHydration(data: HydrationLog, sheetId: string): Promise<void> {
    await appendToSheet('Hydration', 'A:D', [
        [data.date, data.time, data.amount, data.source]
    ], { sheetIdOverride: sheetId, autoCreate: true, headers: [['Date', 'Time', 'Amount (oz)', 'Source']] });
}

export async function appendWellness(data: WellnessLog, sheetId: string): Promise<void> {
    await appendToSheet('Wellness', 'A:C', [
        [data.date, data.mood, data.notes]
    ], { sheetIdOverride: sheetId, autoCreate: true, headers: [['Date', 'Mood (1-5)', 'Notes']] });
}

// --- Coach Notes (Clara's personal memory) ---
export async function appendCoachNote(note: string, sheetId: string): Promise<void> {
    const date = new Date().toLocaleString('en-US');
    await appendToSheet('CoachNotes', 'A:B', [
        [date, note]
    ], { sheetIdOverride: sheetId, autoCreate: true, headers: [['Date', 'Note']] });
}

export async function fetchCoachNotes(sheetId: string): Promise<string[]> {
    try {
        const { auth } = await getAuth(sheetId);
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'CoachNotes!A2:B500',
        });

        const rows = response.data.values || [];
        // Return last 10 notes (most recent first) to keep token count low
        return rows.slice(-10).reverse().map(row => `[${row[0]}] ${row[1]}`);
    } catch {
        // Sheet doesn't exist yet — that's fine
        return [];
    }
}
