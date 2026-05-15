
import { Lift, DataContext, EaglesPeakLog, Cardio, WeighIn } from './types';
import { normalizeExerciseName, matchesExercise, CANONICAL_EXERCISES } from './exercise-aliases';

// Helper: Normalize date to YYYY-MM-DD
const normalizeDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
};

const parseDuration = (s: string): number | null => {
    if (!s) return null;
    const p = s.split(':').map(Number);
    let val = 0;
    if (p.length === 1) val = p[0];
    if (p.length === 2) val = p[0] + p[1] / 60;
    if (p.length === 3) val = p[0] * 60 + p[1] + p[2] / 60;

    // Heuristic for bad data
    if (val > 600) val /= 60;
    return val;
};

export interface ProcessedPeakData {
    date: string;
    ascent: number | null;
    roundTrip: number | null;
    hr: number | null;
}

export function processEaglesPeakData(logs: EaglesPeakLog[]): { processedEaglesPeakData: ProcessedPeakData[], eaglesPeakTicks: number[] } {
    const data = logs.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(l => {
        return {
            date: l.date,
            ascent: parseDuration(l.ascentTime),
            roundTrip: parseDuration(l.overallTime),
            hr: l.averageHR ? parseInt(l.averageHR) : null
        };
    }).filter(d => d.ascent !== null);

    // Calculate Ticks (Every 5 mins)
    if (data.length === 0) return { processedEaglesPeakData: [], eaglesPeakTicks: [] };

    const allValues = data.flatMap(d => [d.ascent, d.roundTrip].filter(v => v !== null) as number[]);
    if (allValues.length === 0) return { processedEaglesPeakData: data, eaglesPeakTicks: [] };

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    // Round down to nearest 10
    const start = Math.floor(min / 10) * 10;
    // Round up to nearest 10
    const end = Math.ceil(max / 10) * 10;

    const ticks = [];
    for (let i = start; i <= end; i += 10) {
        ticks.push(i);
    }

    return { processedEaglesPeakData: data, eaglesPeakTicks: ticks };
}


export function calculateStreak(data: DataContext): number {
    const allDates = new Set<string>();

    // Collect all activity dates
    [...data.lifts, ...data.cardio, ...data.nutrition, ...data.weighIns].forEach(item => {
        const norm = normalizeDate(item.date);
        if (norm) allDates.add(norm);
    });

    let streak = 0;
    const today = new Date();
    const current = new Date(today);

    // Check if streak is active today or yesterday
    // If user hasn't logged today yet, but logged yesterday, streak is still alive.
    // If they logged today, great.

    const todayStr = current.toLocaleDateString('en-CA');

    // If today is logged, we start counting from today.
    // If today is NOT logged, but yesterday IS, we start counting from yesterday.
    // If neither, streak is 0.

    if (allDates.has(todayStr)) {
        // Start check from today
    } else {
        // Move back to yesterday
        current.setDate(current.getDate() - 1);
        const yestStr = current.toLocaleDateString('en-CA');
        if (!allDates.has(yestStr)) {
            return 0; // Broken streak
        }
    }

    // Now count backwards
    while (true) {
        const checkStr = current.toLocaleDateString('en-CA');
        if (allDates.has(checkStr)) {
            streak++;
            current.setDate(current.getDate() - 1); // Move to previous day
        } else {
            break;
        }
    }

    return streak;
}

// Epley Formula: Weight * (1 + Reps/30)
export function calculateE1RM(weight: number, reps: number): number {
    if (reps === 1) return weight;
    // Safety check for NaN or infinite
    if (isNaN(weight) || isNaN(reps) || weight === 0) return 0;
    return Math.round(weight * (1 + reps / 30));
}

export function aggregateDailyBest(points: LiftPoint[]): LiftPoint[] {
    const grouped: { [date: string]: LiftPoint } = {};

    points.forEach(p => {
        //If we already have a point for this date, keep the one with higher e1rm
        if (!grouped[p.date] || p.e1rm > grouped[p.date].e1rm) {
            grouped[p.date] = p;
        }
    });

    return Object.values(grouped).sort((a, b) => new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime());
}

export type Tier = 'T1' | 'T2' | 'T3';

export function detectTier(reps: number): Tier {
    if (reps < 6) return 'T1';
    if (reps < 15) return 'T2';
    return 'T3';
}

export interface LiftPerformance {
    targetSets: number;
    targetReps: number;
    isFail: boolean;
    maxCompletedReps: number;
    totalCompletedReps: number;
    isTestedOneRM: boolean;
}

export function parseLiftPerformance(lift: Lift): LiftPerformance {
    const targetSets = parseFloat(lift.sets) || 0;
    const targetReps = parseFloat(lift.reps) || 0;
    let isFail = false;
    let maxCompletedReps = targetReps;
    let totalCompletedReps = targetSets * targetReps;
    let isTestedOneRM = false;

    if (!lift.notes) {
        return { targetSets, targetReps, isFail, maxCompletedReps, totalCompletedReps, isTestedOneRM };
    }

    const notes = lift.notes.toLowerCase();
    
    if (notes.includes('1rm test') || notes.includes('1rm')) {
        isTestedOneRM = true;
    }

    const isExplicitFail = notes.includes('fail') || notes.includes('miss');

    // 1. Parse Active Mode
    let activeModeMax = -1;
    let activeModeTotal = -1;
    let hasActiveMode = false;

    const activeModeMatch = notes.match(/completed (\d+)(?:\/\d+)? on set (\d+)/i);
    if (activeModeMatch) {
        hasActiveMode = true;
        const achievedOnFailSet = parseInt(activeModeMatch[1], 10);
        const failSetNumber = parseInt(activeModeMatch[2], 10);
        
        if (failSetNumber > 1) {
            activeModeMax = Math.max(targetReps, achievedOnFailSet);
        } else {
            activeModeMax = achievedOnFailSet;
        }
        activeModeTotal = ((failSetNumber - 1) * targetReps) + achievedOnFailSet;
    }

    // 2. Parse Manual Overrides
    // Manual text is everything after a '|' if it exists, otherwise the whole string
    const manualParts = lift.notes.split('|');
    const manualText = manualParts.length > 1 ? manualParts[manualParts.length - 1] : manualParts[0];

    let manualMax = -1;
    let manualTotal = -1;
    let hasManualSeq = false;

    const manualClean = manualText.toLowerCase()
        .replace(/\b(?:rpe\s*)\d+(?:\.\d+)?\b/g, '')        // RPE like "RPE 8"
        .replace(/\b\d+\/10\b/g, '');                       // Ratings like 8/10

    const seqRegex = /(?:\b|^)(\d+(?:[ \t/,-]+\d+)+)(?:\b|$)/g;
    const matches = manualClean.match(seqRegex);
    
    if (matches) {
        let bestSeq = '';
        let maxLen = 0;
        
        for (const m of matches) {
            const parts = m.split(/[ \t/,-]+/).map(s => parseInt(s, 10)).filter(n => !isNaN(n));
            if (parts.length > 1 && parts.length >= maxLen) {
                // Heuristic to skip exact 2-part dates (like 4/09) if they appear alone without fail text
                if (parts.length === 2 && m.includes('/') && parts[0] <= 12 && parts[1] <= 31 && !notes.includes('fail')) {
                    continue;
                }
                maxLen = parts.length;
                bestSeq = m;
            }
        }

        if (bestSeq) {
            const parts = bestSeq.split(/[ \t/,-]+/).map(s => parseInt(s, 10)).filter(n => !isNaN(n));
            hasManualSeq = true;
            manualMax = Math.max(...parts);
            manualTotal = parts.reduce((a, b) => a + b, 0);
        }
    }

    if (isExplicitFail) {
        isFail = true;
        // Priority: Manual sequence > Active Mode > Implicit Fail
        if (hasManualSeq) {
            maxCompletedReps = manualMax;
            totalCompletedReps = manualTotal;
        } else if (hasActiveMode) {
            maxCompletedReps = activeModeMax;
            totalCompletedReps = activeModeTotal;
        } else {
            maxCompletedReps = 0;
            totalCompletedReps = 0;
        }
    } else {
        if (hasManualSeq && manualTotal < targetSets * targetReps) {
            isFail = true;
            maxCompletedReps = manualMax;
            totalCompletedReps = manualTotal;
        }
    }

    return { targetSets, targetReps, isFail, maxCompletedReps, totalCompletedReps, isTestedOneRM };
}

export interface LiftPoint {
    date: string;
    originalDate: string; // Keep full date for sorting
    weight: number;
    reps: number;
    e1rm: number;
    tier: Tier;
    exercise: string;
}

export function processLifts(lifts: Lift[], exerciseFilter: string): LiftPoint[] {
    return lifts
        .filter(l => matchesExercise(l.exercise, exerciseFilter))
        .filter(l => !l.notes?.toLowerCase().includes('deload')) // Exclude deloads from graphs
        .map(l => {
            const perf = parseLiftPerformance(l);
            // Handle "BW" or empty weight strings more gracefully
            let w = parseFloat(l.weight);
            if (isNaN(w)) {
                // Try to strip non-numeric chars (e.g. "Bodyweight+25", "25lbs")
                const numericPart = l.weight.replace(/[^0-9.]/g, '');
                w = parseFloat(numericPart);
                // If still NaN (e.g. pure "BW"), default to 0? Or maybe we can't calc e1RM.
                // Let's default to 0 for now so it doesn't crash, but it won't plot well.
                if (isNaN(w)) w = 0;
            }

            // We use targetReps for tier determination, so an attempted 6x2 still graphs as T1.
            const tier = detectTier(perf.targetReps);
            const actualReps = perf.maxCompletedReps;

            // If actualReps is 0, they completely missed. E1RM string should reflect 0.
            const e1rm = calculateE1RM(w, actualReps);

            return {
                date: l.date.includes('/') ? l.date.split('/').slice(0, 2).join('/') : l.date,
                originalDate: l.date,
                weight: w,
                reps: actualReps,
                e1rm,
                tier,
                exercise: l.exercise
            };
        })
        // exclude completely failed points from creating 0's on the graph, reducing confusion
        .filter(p => p.e1rm > 0)
        .sort((a, b) => new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime());
}

// Wilks Calculation
// Source: https://en.wikipedia.org/wiki/Wilks_Coefficient
export function calculateWilks(bodyWeightLbs: number, totalLbs: number, unit: 'lbs' | 'kg' = 'lbs'): number {
    if (!bodyWeightLbs || !totalLbs) return 0;

    let bw = bodyWeightLbs;
    let total = totalLbs;

    if (unit === 'lbs') {
        bw = bodyWeightLbs / 2.20462;
        total = totalLbs / 2.20462;
    }

    const a = -216.0475144;
    const b = 16.2606339;
    const c = -0.002388645;
    const d = -0.00113732;
    const e = 7.01863E-06;
    const f = -1.291E-08;

    const x = bw;
    const coeff = 500 / (a + b * x + c * Math.pow(x, 2) + d * Math.pow(x, 3) + e * Math.pow(x, 4) + f * Math.pow(x, 5));

    return Math.round(total * coeff * 100) / 100; // Round to 2 decimals
}

export function getWilksLevel(score: number): { level: string; color: string; next: number } {
    if (score < 200) return { level: 'Untrained', color: 'text-zinc-500', next: 200 };
    if (score < 250) return { level: 'Novice', color: 'text-bronze-500', next: 250 }; // Bronze
    if (score < 325) return { level: 'Intermediate', color: 'text-sky-400', next: 325 }; // Silver
    if (score < 400) return { level: 'Advanced', color: 'text-amber-500', next: 400 }; // Gold
    if (score < 500) return { level: 'Elite', color: 'text-emerald-400', next: 500 };
    return { level: 'Legendary', color: 'text-purple-500', next: 600 };
}



export interface PersonalBest {
    exercise: string;
    weight: number;
    reps: number;
    sets: number;
    e1rm: number;
    date: string;
}

/**
 * Returns a Set of composite keys identifying lifts that were the FIRST time
 * a new weight record was set for that (exercise, repCount) scheme.
 *
 * Key format: "date|canonicalExercise|weight|reps|sets"
 * Scans chronologically — re-achieving a prior max is NOT flagged.
 * GZCLP-aware: T1 reps=3/2/1 and T2 reps=10/8/6 are each separate tracks.
 */
export function detectPRLiftKeys(lifts: Lift[]): Set<string> {
    const sorted = [...lifts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const bestByScheme = new Map<string, number>();
    const prKeys = new Set<string>();

    for (const l of sorted) {
        const perf = parseLiftPerformance(l);
        if (perf.maxCompletedReps === 0) continue; // Skip completely failed lifts
        
        const w = parseFloat(l.weight) || 0;
        if (w <= 0) continue;
        const canonical = normalizeExerciseName(l.exercise);
        
        // PR tracked against what they *actually* did, so doing a heavy single replaces a single, not the intended double
        const schemeKey = `${canonical}:${perf.maxCompletedReps}`;
        const prevBest = bestByScheme.get(schemeKey) ?? 0;

        if (w > prevBest) {
            bestByScheme.set(schemeKey, w);
            // Only flag as a PR if they actually achieved the target reps for at least one set
            if (perf.maxCompletedReps >= perf.targetReps) {
                prKeys.add(`${l.date}|${canonical}|${l.weight}|${l.reps}|${l.sets}`); // Keep original reps/sets for the key string matching
            }
        }
    }
    return prKeys;
}

export function determinePersonalBests(lifts: Lift[]): Record<string, PersonalBest | null> {
    const getBest = (canonicalName: string): PersonalBest | null => {
        const matches = lifts
            .filter(l => matchesExercise(l.exercise, canonicalName))
            .filter(l => !l.notes?.toLowerCase().includes('deload')); // Exclude deloads from PBs
        if (matches.length === 0) return null;

        // Sort by e1RM desc
        const sorted = matches.map(l => {
            const perf = parseLiftPerformance(l);
            const w = parseFloat(l.weight) || 0;
            const r = perf.maxCompletedReps; // Use actual reps for best e1RM
            const s = parseFloat(l.sets) || 0;
            const e1rm = calculateE1RM(w, r); // Use shared helper — handles reps===1 edge case
            return {
                exercise: l.exercise,
                weight: w,
                reps: r, // Can still return r so UI shows true max achieved if they failed
                sets: s,
                e1rm,
                date: l.date
            };
        }).filter(p => p.e1rm > 0).sort((a, b) => b.e1rm - a.e1rm);

        return sorted[0];
    };

    return {
        'Squat': getBest(CANONICAL_EXERCISES.SQUAT),
        'Bench': getBest(CANONICAL_EXERCISES.BENCH),
        'Deadlift': getBest(CANONICAL_EXERCISES.DEADLIFT),
        'OHP': getBest(CANONICAL_EXERCISES.OHP)
    };
};

export interface TestedOneRM {
    weight: number;
    date: string;
}

/**
 * Finds lifts explicitly marked as 1RM tests (notes contain "1rm", reps=1).
 * Returns per-exercise history sorted chronologically, so the last entry is
 * the most recent test and delta vs the previous test is easy to compute.
 */
export function getTestedOneRepMaxes(lifts: Lift[]): Record<string, TestedOneRM[]> {
    const testLifts = lifts.filter(l => {
        const perf = parseLiftPerformance(l);
        return perf.targetReps === 1 && perf.isTestedOneRM && perf.maxCompletedReps >= 1;
    });

    const result: Record<string, TestedOneRM[]> = {};
    for (const l of testLifts) {
        const canonical = normalizeExerciseName(l.exercise);
        if (!result[canonical]) result[canonical] = [];
        result[canonical].push({ weight: parseFloat(l.weight) || 0, date: l.date });
    }

    // Sort each exercise chronologically so last entry = most recent test
    for (const key of Object.keys(result)) {
        result[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return result;
}


/**
 * Calculates a simple moving average for a time series.
 * @param data Array of objects with date and value
 * @param valueKey Key of the value to average
 * @param windowSize Number of points to average (e.g. 7)
 * @returns Array with original data plus 'avg' property
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateMovingAverage<T extends { date: string;[key: string]: any }>(
    data: T[],
    valueKey: keyof T,
    windowSize: number = 7
): (T & { [key: string]: number | null })[] {
    // Sort by date ascending
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sorted.map((item) => {
        // Time-Based Window (Corrected 7-Day Logic)
        // Previous Entry-Based logic caused mismatches if data had gaps.
        const itemDate = new Date(item.date).getTime();
        const msInDay = 86400000;
        // Range: [Date - (N-1) days, Date]
        const windowStart = itemDate - ((windowSize - 1) * msInDay);

        const window = sorted.filter(p => {
            const d = new Date(p.date).getTime();
            return d >= windowStart && d <= itemDate;
        });

        const validPoints = window.filter(p => p[valueKey] !== null && !isNaN(parseFloat(String(p[valueKey]))));

        let avg = null;
        if (validPoints.length > 0) {
            const sum = validPoints.reduce((acc, curr) => acc + parseFloat(String(curr[valueKey])), 0);
            avg = sum / validPoints.length;
        }

        const result = { ...item } as Record<string, unknown>;
        result[`${String(valueKey)}Avg`] = avg;
        return result as T & { [key: string]: number | null };
    });
}

export function calculateTDEE(weight: number | undefined | null, bmrOverride: number | undefined | null, tdeeOverride: number | undefined | null, activityLevel: number | undefined | null): number {
    if (tdeeOverride) return Number(tdeeOverride);

    let bmr = 2000;
    if (bmrOverride) bmr = Number(bmrOverride);
    else if (weight) bmr = Number(weight) * 11; // Rough est

    const activityScalar = Number(activityLevel || 1.2);
    return Math.round(bmr * activityScalar);
}

export function calculateNetCalories(tdee: number, caloriesIn: number, activityBurn: number, includeBurnInBudget: boolean = false): number {
    const budget = includeBurnInBudget ? tdee + activityBurn : tdee;
    return Math.round(budget - caloriesIn);
}

/**
 * Aggregates daily data points into weekly averages for long-term graphs.
 * Preserves the first date of the week as the label.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function aggregateByWeek(data: any[]): any[] {
    if (!data || data.length === 0) return [];

    // Sort ascending
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const result = [];
    let currentWeek: any[] = [];
    let weekStart = new Date(sorted[0].date).getTime();
    const MS_IN_WEEK = 7 * 86400000;

    for (const point of sorted) {
        const pointDate = new Date(point.date).getTime();

        // If we crossed into a new 7-day window, process the old one
        if (pointDate - weekStart >= MS_IN_WEEK) {
            if (currentWeek.length > 0) {
                result.push(averageCurrentWeek(currentWeek));
            }
            // Reset for next week
            currentWeek = [point];
            weekStart = pointDate;
        } else {
            currentWeek.push(point);
        }
    }

    // Push the final partial week
    if (currentWeek.length > 0) {
        result.push(averageCurrentWeek(currentWeek));
    }

    return result;
}

// Helper for the above
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function averageCurrentWeek(weekData: any[]): any {
    const avg = (key: string) => {
        const valid = weekData.filter(d => d[key] !== null && d[key] !== undefined && !isNaN(parseFloat(d[key])));
        if (valid.length === 0) return null;
        const sum = valid.reduce((acc, curr) => acc + parseFloat(curr[key]), 0);
        return parseFloat((sum / valid.length).toFixed(1)); // Keep it somewhat precise
    };

    return {
        date: weekData[0].date, // Use the start date of the week
        weight: avg('weight'),
        bodyFat: avg('bodyFat'),
        weightAvg: avg('weightAvg'),
        bodyFatAvg: avg('bodyFatAvg')
    };
}
