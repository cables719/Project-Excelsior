import { DataContext, Lift, Cardio, Nutrition, WeighIn } from './types';
import { parseLiftPerformance } from './analytics';

export interface WeeklyStats {
    period: { start: string; end: string };
    lifts: {
        count: number;
        volume: number;
        exercises: string[];
        topLift: { exercise: string; weight: string; reps: string } | null;
        tier1Count: number;
    };
    nutrition: {
        daysLogged: number;
        avgCalories: number;
        avgProtein: number;
        compliance: number; // 0-1 score based on logging frequency
    };
    cardio: {
        count: number;
        totalMinutes: number;
        activities: string[];
    };
    body: {
        weightChange: number; // Positive = gain, Negative = loss
        currentWeight: number;
    };
    highlights: string[];
}

// Helper to check if a date string is within the target window
const isWithin = (dateStr: string, start: Date, end: Date) => {
    // Normalize date string (M/D/YYYY or YYYY-MM-DD to Date object)
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    // Reset times to midnight for fair comparison
    const dTime = d.setHours(0, 0, 0, 0);
    const sTime = start.setHours(0, 0, 0, 0);
    const eTime = end.setHours(23, 59, 59, 999);

    return dTime >= sTime && dTime <= eTime;
};

// Helper to get 7-day average for a specific date from a list of weigh-ins
const getRollingAverage = (weighIns: WeighIn[], targetDate: Date) => {
    const windowStart = new Date(targetDate);
    windowStart.setDate(targetDate.getDate() - 6);

    const relevant = weighIns.filter(w => isWithin(w.date, windowStart, targetDate));
    if (relevant.length === 0) return null;

    const sum = relevant.reduce((acc, curr) => acc + (parseFloat(curr.weight) || 0), 0);
    return sum / relevant.length;
};

export const getWeeklyStats = (data: DataContext, requestDate: Date = new Date()): WeeklyStats => {
    // 1. Determine Window based on "Completed Week" logic
    // If we request on Sunday (Start of new week), we want the FULL previous week (Sun-Sat).
    // If we request on Thursday (Mid-week test), we want the previous 7 COMPLETED days (Wed-Wed).
    // The user requested: "Week should be one less day... e.g. Saturday - Saturday".
    // So if today is Thursday 29th, we want Wed 21st - Wed 28th.

    const endDate = new Date(requestDate);
    endDate.setDate(requestDate.getDate() - 1); // Yesterday

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6); // 7 days total inclusive (e.g. Wed-Wed)

    // 2. Filter Data
    const weekLifts = data.lifts.filter(x => isWithin(x.date, startDate, endDate));
    const weekNutrition = data.nutrition.filter(x => isWithin(x.date, startDate, endDate));
    const weekCardio = data.cardio.filter(x => isWithin(x.date, startDate, endDate));

    // For Weight, we need the whole dataset to calculate rolling averages
    // const weekWeighIns = data.weighIns.filter(x => isWithin(x.date, startDate, endDate));

    // 3. Aggregate Lifts
    // Volume uses actual completed reps if available
    const volume = weekLifts.reduce((acc, curr) => {
        const perf = parseLiftPerformance(curr);
        return acc + ((parseFloat(curr.weight) || 0) * perf.totalCompletedReps);
    }, 0);
    const exercises = Array.from(new Set(weekLifts.map(l => l.exercise)));

    // Count Sessions (Unique Dates)
    const sessionDates = new Set(weekLifts.map(l => l.date));

    // Find "Top Lift" (Heaviest Weight moved)
    let topLift: Lift | null = null;
    let maxWeight = 0;

    weekLifts.forEach(l => {
        const w = parseFloat(l.weight);
        if (!isNaN(w) && w > maxWeight) {
            maxWeight = w;
            topLift = l;
        }
    });

    const tier1Count = weekLifts.filter(l => {
        const reps = parseFloat(l.reps);
        return reps <= 5 && reps > 0; // Simplified GZCLP logic for T1
    }).length;

    // 4. Aggregate Nutrition (Group by Day first)
    const dailyNutrition: Record<string, { cals: number, pro: number }> = {};
    weekNutrition.forEach(n => {
        const d = n.date.split(' at ')[0];
        if (!dailyNutrition[d]) dailyNutrition[d] = { cals: 0, pro: 0 };
        dailyNutrition[d].cals += parseFloat(n.calories) || 0;
        dailyNutrition[d].pro += parseFloat(n.protein) || 0;
    });

    const daysLogged = Object.keys(dailyNutrition).length;
    const totalCals = Object.values(dailyNutrition).reduce((a, b) => a + b.cals, 0);
    const totalPro = Object.values(dailyNutrition).reduce((a, b) => a + b.pro, 0);

    // 5. Cardio
    const totalMinutes = weekCardio.reduce((acc, c) => acc + (parseFloat(c.duration) || 0), 0);
    const activities = Array.from(new Set(weekCardio.map(c => c.activity)));

    // 6. Body Weight Delta (Rolling Average)
    const avgStart = getRollingAverage(data.weighIns, startDate);
    const avgEnd = getRollingAverage(data.weighIns, endDate);

    let weightChange = 0;
    if (avgStart && avgEnd) {
        weightChange = avgEnd - avgStart;
    }

    // 7. Highlights Scan (word-boundary match to avoid 'pr' matching 'protein', etc.)
    const highlights: string[] = [];
    const keywordPatterns = ['pr', 'max', 'win', 'record', 'best', 'hard', 'easy', 'fail']
        .map(k => new RegExp(`\\b${k}\\b`, 'i'));

    [...weekLifts, ...weekCardio, ...weekNutrition].forEach(item => {
        if (!item.notes) return;
        if (keywordPatterns.some(pattern => pattern.test(item.notes))) {
            const date = item.date.split('/').slice(0, 2).join('/');
            let context = '';
            if ('exercise' in item) context = (item as Lift).exercise;
            if ('activity' in item) context = (item as Cardio).activity;
            if ('item' in item) context = (item as Nutrition).item;

            highlights.push(`${date} - ${context}: "${item.notes}"`);
        }
    });

    return {
        period: {
            start: startDate.toLocaleDateString(),
            end: endDate.toLocaleDateString()
        },
        highlights,
        lifts: {
            count: sessionDates.size, // Sessions (Unique Days)
            volume,
            exercises,
            topLift: topLift ? { exercise: (topLift as any).exercise, weight: (topLift as any).weight, reps: (topLift as any).reps } : null,
            tier1Count
        },
        nutrition: {
            daysLogged,
            avgCalories: daysLogged ? Math.round(totalCals / daysLogged) : 0,
            avgProtein: daysLogged ? Math.round(totalPro / daysLogged) : 0,
            compliance: daysLogged / 7
        },
        cardio: {
            count: weekCardio.length,
            totalMinutes,
            activities
        },
        body: {
            weightChange: parseFloat(weightChange.toFixed(1)),
            currentWeight: avgEnd ? parseFloat(avgEnd.toFixed(1)) : 0
        }
    };
};
