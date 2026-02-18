import { google } from 'googleapis';
import { DataContext, WeighIn, Lift, Cardio, Nutrition, EaglesPeakLog, UserProfile } from './types';
export type { DataContext, WeighIn, Lift, Cardio, Nutrition, EaglesPeakLog, UserProfile };
import { DataCache } from './cache';
import { getUserConfig } from './user-store';
import { determinePersonalBests } from './analytics';

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

    const ranges = [
        'Weigh-ins!A2:E5000',
        'Lifts!A4:G5000',
        'Cardio!A4:G5000',
        'Nutrition!A2:F5000',
        'User!A:B', // Fetch User Profile
    ];

    // Only fetch Eagles Peak if it exists
    if (hasEaglesPeak) {
        ranges.push('Eagles Peak!A2:L5000');
    }

    // [NEW] Dynamic Fetching of Universal Sheets
    const knownSheets = ['Weigh-ins', 'Lifts', 'Cardio', 'Nutrition', 'User', 'Eagles Peak', 'Feedback', 'Memory'];
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
    const eaglesPeakRaw = hasEaglesPeak ? valueRanges[5] : null;

    // Extract Extra Data
    const extraDataStart = 5 + (hasEaglesPeak ? 1 : 0);
    const extraDataRaw = valueRanges.slice(extraDataStart);

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


    // Slice recent data
    const recentWeighIns = allWeighIns; // Keep all for graphing mostly
    const recentLifts = allLifts.slice(-50);
    const recentCardio = allCardio.slice(-20);



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



    formattedString += `\n[PERSONAL RECORDS (All-Time Calculated Best e1RM)]\n`;
    const personalBests = determinePersonalBests(allLifts);
    Object.entries(personalBests).forEach(([lift, data]) => {
        if (data) {
            formattedString += `- ${lift}: ${Math.round(data.e1rm)}lbs (Based on ${data.sets}x${data.reps} @ ${data.weight}lbs on ${data.date})\n`;
        }
    });

    formattedString += `\n[RECENT LIFTS (Last 50 entries)]\n`;
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

    formattedString += `\n[RECENT NUTRITION HISTORY]\n`;
    const nutritionByDate: Record<string, string[]> = {};
    // User requested "everything" - increasing limit significantly. 
    // 1000 items ~ 6-9 months of logs.
    const recentNutrition = allNutrition.slice(-100);
    recentNutrition.forEach(n => {
        if (!nutritionByDate[n.date]) nutritionByDate[n.date] = [];
        nutritionByDate[n.date].push(`${n.item} (${n.calories}kcal, ${n.protein}g${n.notes ? ', ' + n.notes : ''})`);
    });

    // Sort dates desc
    Object.keys(nutritionByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).forEach(date => {
        formattedString += `${date}:\n`;
        nutritionByDate[date].forEach(item => formattedString += `  - ${item}\n`);
    });

    if (eaglesPeakLogs.length > 0) {
        formattedString += `\n[EAGLES PEAK LOGS]\n`;
        // Sort reverse chronological
        eaglesPeakLogs.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(l => {
            const hr = l.averageHR ? `AvgHR: ${l.averageHR}` : '';
            const max = l.maxHR ? `MaxHR: ${l.maxHR}` : '';
            const cal = l.calories ? `${l.calories}kcal` : '';
            const notes = l.notes ? `(${l.notes})` : '';
            formattedString += `- ${l.date}: Ascent ${l.ascentTime}, Total ${l.overallTime} ${hr} ${max} ${cal} ${notes}\n`;
        });
    }

    // Append Extra Sheets Data
    if (extraSheets.length > 0) {
        formattedString += `\n[ADDITIONAL SHEETS DATA]\n`;
        extraSheets.forEach((name, index) => {
            const raw = extraDataRaw[index];
            if (raw && raw.values && raw.values.length > 0) {
                formattedString += `--- SHEET: ${name} ---\n`;
                // Simple CSV-like dump
                raw.values.forEach((row: any[]) => {
                    formattedString += row.map((c: any) => String(c).replace(/,/g, ';')).join(' | ') + '\n';
                });
                formattedString += `\n`;
            }
        });
    }

    const result = {
        weighIns: recentWeighIns,
        lifts: recentLifts,
        cardio: recentCardio,
        nutrition: allNutrition.slice(-100),
        eaglesPeakLogs: eaglesPeakLogs.slice(-10),
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
