import { DataContext } from './types';
import { determinePersonalBests } from './analytics';

// Helper to format Context String
export function formatDataContext(data: DataContext): string {
    let formattedString = `=== RECENT DATA CONTEXT ===\n\n`;

    // [OPTIMIZATION] Cap context to 14 days to save tokens
    const contextDays = 14;

    // User Profile
    if (data.userProfile) {
        formattedString += `[USER PROFILE]\n`;
        Object.entries(data.userProfile).forEach(([k, v]) => {
            // Skip preferences in string to save tokens
            if (k !== 'preferences') {
                formattedString += `- ${k}: ${v}\n`;
            }
        });
        formattedString += `\n`;
    }

    // Weigh-ins
    // We use data.weighIns directly. If fetchContext slice logic changes, this just takes what is given.
    // Ideally we slice here too to be safe.
    if (data.weighIns && data.weighIns.length > 0) {
        const recentW = data.weighIns.slice(-contextDays);
        if (recentW.length > 0) {
            formattedString += `[RECENT WEIGH-INS (Last ${recentW.length} Days)]\n`;
            recentW.forEach(w => {
                const bf = w.bodyFat ? `(${w.bodyFat}% BF)` : '';
                const n = w.notes ? `| Note: ${w.notes}` : '';
                formattedString += `- ${w.date}: ${w.weight}lb ${bf} ${n}\n`;
            });
        }
    }

    // Cardio
    if (data.cardio && data.cardio.length > 0) {
        formattedString += `\n[RECENT CARDIO]\n`;
        data.cardio.slice(-20).forEach(c => {
            formattedString += `- ${c.date}: ${c.activity} (${c.duration} min / ${c.distance}) ${c.heartRate ? 'HR:' + c.heartRate : ''} ${c.notes ? '| ' + c.notes : ''}\n`;
        });
    }

    // Personal Bests (Calculated)
    if (data.lifts && data.lifts.length > 0) {
        formattedString += `\n[PERSONAL RECORDS (All-Time Calculated Best e1RM)]\n`;
        const personalBests = determinePersonalBests(data.lifts);
        Object.entries(personalBests).forEach(([lift, val]) => {
            if (val) {
                formattedString += `- ${lift}: ${Math.round(val.e1rm)}lbs (Based on ${val.sets}x${val.reps} @ ${val.weight}lbs on ${val.date})\n`;
            }
        });

        formattedString += `\n[RECENT LIFTS (Last 50 entries)]\n`;
        // Group by date
        const liftsByDate: Record<string, string[]> = {};
        data.lifts.slice(-50).forEach(l => {
            if (!liftsByDate[l.date]) liftsByDate[l.date] = [];
            const note = l.notes ? `(${l.notes})` : '';
            liftsByDate[l.date].push(`${l.exercise} ${l.weight}lb (${l.sets}x${l.reps}) ${note}`);
        });

        Object.entries(liftsByDate).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).forEach(([date, exercises]) => {
            formattedString += `${date}:\n`;
            exercises.forEach(ex => formattedString += `  - ${ex}\n`);
        });
    }

    // Nutrition
    if (data.nutrition && data.nutrition.length > 0) {
        formattedString += `\n[RECENT NUTRITION HISTORY]\n`;
        const nutritionByDate: Record<string, string[]> = {};
        data.nutrition.slice(-30).forEach(n => {
            if (!nutritionByDate[n.date]) nutritionByDate[n.date] = [];
            nutritionByDate[n.date].push(`${n.item} (${n.calories}kcal, ${n.protein}g${n.notes ? ', ' + n.notes : ''})`);
        });

        Object.keys(nutritionByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).forEach(date => {
            formattedString += `${date}:\n`;
            nutritionByDate[date].forEach(item => formattedString += `  - ${item}\n`);
        });
    }

    // Eagles Peak
    if (data.eaglesPeakLogs && data.eaglesPeakLogs.length > 0) {
        formattedString += `\n[EAGLES PEAK LOGS]\n`;
        data.eaglesPeakLogs.slice(-10).slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(l => {
            const hr = l.averageHR ? `AvgHR: ${l.averageHR}` : '';
            const max = l.maxHR ? `MaxHR: ${l.maxHR}` : '';
            const cal = l.calories ? `${l.calories}kcal` : '';
            const notes = l.notes ? `(${l.notes})` : '';
            formattedString += `- ${l.date}: Ascent ${l.ascentTime}, Total ${l.overallTime} ${hr} ${max} ${cal} ${notes}\n`;
        });
    }

    // Hydration
    if (data.hydrationLogs && data.hydrationLogs.length > 0) {
        formattedString += `\n[RECENT HYDRATION (Last 20 entries)]\n`;
        // Sort optional if needed, but assuming input is somewhat ordered or we just take end
        data.hydrationLogs.slice(-20).forEach(h => {
            formattedString += `- ${h.date} ${h.time}: ${h.amount}oz (${h.source})\n`;
        });
    }

    // Wellness
    if (data.wellnessLogs && data.wellnessLogs.length > 0) {
        formattedString += `\n[RECENT WELLNESS (Last 14 entries)]\n`;
        data.wellnessLogs.slice(-14).forEach(w => {
            formattedString += `- ${w.date}: Mood ${w.mood}/5 (${w.notes})\n`;
        });
    }

    // Extra Sheets (if they exist in data context, specifically added)
    // In DataContext type we added [key: string]: any, but better to check specific property if we added it
    // data.extraSheets is not in the interface explicitly but passed in result.
    // We can cast data to any to access it or update interface. 
    // For now, let's skip extra sheets in the "client reconstruction" phase to keep it safe, 
    // unless we explicitly add it to interface.
    // The previous fetchContext logic added it.

    return formattedString;
}
