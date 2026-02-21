import { Lift } from './types';
import { detectTier } from './analytics';

export interface WorkoutSet {
    exercise: string;
    targetWeight: number;
    targetSets: number;
    targetReps: number;
    tier: 'T1' | 'T2' | 'T3';
    restSeconds: number;
}

export interface WorkoutPlan {
    dayName: string; // e.g., "Day A: Squat / Bench"
    sets: WorkoutSet[];
}

const DAYS = ['A', 'B', 'C', 'D'];

const T1_PROGRESSION = [
    { sets: 5, reps: 3 },
    { sets: 6, reps: 2 },
    { sets: 10, reps: 1 }
];

const T2_PROGRESSION = [
    { sets: 3, reps: 10 },
    { sets: 3, reps: 8 },
    { sets: 3, reps: 6 }
];

const T3_PROGRESSION = [
    { sets: 3, reps: 15 } // Static for now, usually AMRAP last set
];

export function predictNextWorkout(history: Lift[]): WorkoutPlan {
    // 1. Determine which Day we are on based on the most recent T1 lifts
    const recentT1s = history
        .filter(l => detectTier(parseFloat(l.reps) || 0) === 'T1')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let nextDay = 'A';
    if (recentT1s.length > 0) {
        const lastT1Exercise = recentT1s[0].exercise.toLowerCase();
        if (lastT1Exercise.includes('squat')) nextDay = 'B';
        else if (lastT1Exercise.includes('overhead') || lastT1Exercise.includes('ohp')) nextDay = 'C';
        else if (lastT1Exercise.includes('bench')) nextDay = 'D';
        else if (lastT1Exercise.includes('dead')) nextDay = 'A';
    }

    // Determine the core exercises for the predicted day based on the user's explicit instructions:
    // Day A: T1 Squat, T2 Bench
    // Day B: T1 OHP, T2 Dlift
    // Day C: T1 Bench, T2 Squat
    // Day D: T1 Dlift, T2 OHP
    // T1 pullups on days A and D and T2 pullups on days B and C.

    let t1Exercise = '';
    let t2Exercise = '';
    let t1PullupDay = false;

    switch (nextDay) {
        case 'A': t1Exercise = 'Squat'; t2Exercise = 'Bench Press'; t1PullupDay = true; break;
        case 'B': t1Exercise = 'Overhead Press'; t2Exercise = 'Deadlift'; t1PullupDay = false; break;
        case 'C': t1Exercise = 'Bench Press'; t2Exercise = 'Squat'; t1PullupDay = false; break;
        case 'D': t1Exercise = 'Deadlift'; t2Exercise = 'Overhead Press'; t1PullupDay = true; break;
    }

    // 2. Look back at the history to find the last performance of these specific tier/exercise combos
    const getTarget = (ex: string, tier: 'T1' | 'T2' | 'T3'): WorkoutSet => {
        const pastLogs = history
            .filter(l => l.exercise.toLowerCase().includes(ex.toLowerCase()))
            .filter(l => detectTier(parseFloat(l.reps) || 0) === tier)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        let targetWeight = 45; // Empty bar default
        let currentStageIdx = 0; // Index in the progression array

        const progArray = tier === 'T1' ? T1_PROGRESSION : tier === 'T2' ? T2_PROGRESSION : T3_PROGRESSION;

        if (pastLogs.length > 0) {
            const lastLog = pastLogs[0];
            const lastWeight = parseFloat(lastLog.weight) || 45;
            const lastSets = parseFloat(lastLog.sets) || 0;
            const lastReps = parseFloat(lastLog.reps) || 0;

            // Check if they failed last time
            const failed = lastLog.notes.toLowerCase().includes('fail');

            // Find current stage based on last logged sets/reps
            currentStageIdx = progArray.findIndex(p => p.sets === lastSets && p.reps === lastReps);
            if (currentStageIdx === -1) currentStageIdx = 0; // Fallback to stage 1 if weird data

            if (failed) {
                // Move to next progression stage, keep same weight
                currentStageIdx++;
                if (currentStageIdx >= progArray.length) {
                    // Failing at the end of the progression means testing a 5RM next time theoretically
                    // We'll reset to stage 0 and drop weight slightly for now
                    currentStageIdx = 0;
                    targetWeight = lastWeight; // Reset cycle typically tests a new 5RM. 
                } else {
                    targetWeight = lastWeight; // Keep weight, change rep scheme
                }
            } else {
                // Succeeded! Increment weight, stay in same stage
                targetWeight = lastWeight + 5; // User specified +5 for everything now
            }
        }

        return {
            exercise: ex,
            targetWeight: Math.max(0, targetWeight), // Allow 0 for bodyweight like pullups
            targetSets: progArray[currentStageIdx].sets,
            targetReps: progArray[currentStageIdx].reps,
            tier: tier,
            restSeconds: tier === 'T1' ? 180 : tier === 'T2' ? 120 : 90 // Default rest times
        };
    };

    const planSets: WorkoutSet[] = [];

    // T1
    planSets.push(getTarget(t1Exercise, 'T1'));
    // T1 Pullups if applicable
    if (t1PullupDay) planSets.push(getTarget('Pullups', 'T1'));

    // T2
    planSets.push(getTarget(t2Exercise, 'T2'));
    // T2 Pullups if applicable
    if (!t1PullupDay) planSets.push(getTarget('Pullups', 'T2'));

    // T3 Placeholder (Can add logic later for tracking accessories, usually static DB rows/curls)
    // planSets.push({ exercise: 'Accessory 1', targetWeight: 0, targetSets: 3, targetReps: 15, tier: 'T3', restSeconds: 90 });

    return {
        dayName: `Day ${nextDay}: ${t1Exercise}`,
        sets: planSets
    };
}
