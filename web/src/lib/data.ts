import { google } from 'googleapis';
import { DataContext, WeighIn, Lift, Cardio, Nutrition, EaglesPeakLog, UserProfile, HydrationLog, WellnessLog } from './types';
export type { DataContext, WeighIn, Lift, Cardio, Nutrition, EaglesPeakLog, UserProfile };
import { formatDataContext } from './format-context';
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

export async function appendFeedback(content: string, sheetIdOverride?: string): Promise<void> {
    const { auth, sheetId } = await getAuth(sheetIdOverride);
    if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID');

    const sheets = google.sheets({ version: 'v4', auth });
    const date = new Date().toLocaleString('en-US');

    const values = [
        [date, content]
    ];

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: 'Feedback!A:B',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values },
        });
    } catch (error) {
        // Likely the "Feedback" sheet doesn't exist. Create it.
        try {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: sheetId,
                requestBody: {
                    requests: [{ addSheet: { properties: { title: 'Feedback' } } }]
                }
            });
            // Retry append
            await sheets.spreadsheets.values.append({
                spreadsheetId: sheetId,
                range: 'Feedback!A:B',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values },
            });
        } catch (retryError) {
            console.error("Failed to create Feedback sheet or append:", retryError);
            throw retryError;
        }
    }
    // No need to clear cache for feedback
}

export async function appendEaglesPeakLog(data: EaglesPeakLog, sheetIdOverride?: string): Promise<void> {
    const { auth, sheetId } = await getAuth(sheetIdOverride);
    if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID');

    const sheets = google.sheets({ version: 'v4', auth });

    const values = [
        [data.date, data.ascentTime, data.overallTime, data.averagePace, data.averageHR, data.maxHR, data.zone5, data.zone4, data.zone3, data.zone2, data.calories, data.notes]
    ];

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: 'Eagles Peak!A:L',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values },
        });
    } catch (error) {
        // Create sheet if missing
        try {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: sheetId,
                requestBody: {
                    requests: [{ addSheet: { properties: { title: 'Eagles Peak' } } }]
                }
            });
            // Retry
            await sheets.spreadsheets.values.append({
                spreadsheetId: sheetId,
                range: 'Eagles Peak!A:L',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values },
            });
        } catch (retryError) {
            console.error("Failed to create Eagles Peak sheet or append:", retryError);
            throw retryError;
        }
    }

    DataCache.clear(sheetId);
}

// Hydration Logging
export async function appendHydration(data: HydrationLog, sheetId: string) {
    const { auth } = await getAuth(sheetId);
    const sheets = google.sheets({ version: 'v4', auth });

    // Ensure Sheet Exists
    try {
        await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Hydration!A1',
        });
    } catch (e: any) {
        // Create if missing
        console.log("Creating Hydration sheet...");
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
                requests: [{
                    addSheet: {
                        properties: { title: 'Hydration' }
                    }
                }]
            }
        });
        // Add Headers
        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: 'Hydration!A1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [['Date', 'Time', 'Amount (oz)', 'Source']]
            }
        });
    }

    // Append Data
    await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Hydration!A:D',
        valueInputOption: 'RAW',
        requestBody: {
            values: [[data.date, data.time, data.amount, data.source]]
        }
    });

    // Invalidate Cache
    DataCache.clear(sheetId);
}

// Wellness Logging
export async function appendWellness(data: WellnessLog, sheetId: string) {
    const { auth } = await getAuth(sheetId);
    const sheets = google.sheets({ version: 'v4', auth });

    // Ensure Sheet Exists
    try {
        await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Wellness!A1',
        });
    } catch (e: any) {
        // Create if missing
        console.log("Creating Wellness sheet...");
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
                requests: [{
                    addSheet: {
                        properties: { title: 'Wellness' }
                    }
                }]
            }
        });
        // Add Headers
        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: 'Wellness!A1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [['Date', 'Mood (1-5)', 'Notes']]
            }
        });
    }

    // Append Data
    await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Wellness!A:C', // Reduced range
        valueInputOption: 'RAW',
        requestBody: {
            values: [[data.date, data.mood, data.notes]]
        }
    });

    // Invalidate Cache
    DataCache.clear(sheetId);
}


