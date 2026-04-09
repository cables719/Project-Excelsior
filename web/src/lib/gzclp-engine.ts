import { Lift } from './types';
import { detectTier } from './analytics';
import { CANONICAL_EXERCISES, matchesExercise, normalizeExerciseName } from './exercise-aliases';

export interface WorkoutSet {
    exercise: string;
    targetWeight: number;
    targetSets: number;
    targetReps: number;
    tier: 'T1' | 'T2' | 'T3';
    restSeconds: number;
    isLinkedToPrevious?: boolean;
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
        const lastT1 = normalizeExerciseName(recentT1s[0].exercise);
        if (lastT1 === CANONICAL_EXERCISES.SQUAT) nextDay = 'B';
        else if (lastT1 === CANONICAL_EXERCISES.OHP) nextDay = 'C';
        else if (lastT1 === CANONICAL_EXERCISES.BENCH) nextDay = 'D';
        else if (lastT1 === CANONICAL_EXERCISES.DEADLIFT) nextDay = 'A';
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
        case 'A': t1Exercise = CANONICAL_EXERCISES.SQUAT; t2Exercise = CANONICAL_EXERCISES.BENCH; t1PullupDay = true; break;
        case 'B': t1Exercise = CANONICAL_EXERCISES.OHP; t2Exercise = CANONICAL_EXERCISES.DEADLIFT; t1PullupDay = false; break;
        case 'C': t1Exercise = CANONICAL_EXERCISES.BENCH; t2Exercise = CANONICAL_EXERCISES.SQUAT; t1PullupDay = false; break;
        case 'D': t1Exercise = CANONICAL_EXERCISES.DEADLIFT; t2Exercise = CANONICAL_EXERCISES.OHP; t1PullupDay = true; break;
    }

    // 2. Look back at the history to find the last performance of these specific tier/exercise combos
    const getTarget = (ex: string, tier: 'T1' | 'T2' | 'T3'): WorkoutSet => {
        const isMatch = (logEx: string) => matchesExercise(logEx, ex);

        const pastLogs = history
            .filter(l => isMatch(l.exercise))
            .filter(l => detectTier(parseFloat(l.reps) || 0) === tier)
            .filter(l => !l.notes?.toLowerCase().includes('deload') && !l.notes?.toLowerCase().includes('1rm test'))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        let targetWeight = 45; // Empty bar default
        let currentStageIdx = 0; // Index in the progression array

        const progArray = tier === 'T1' ? T1_PROGRESSION : tier === 'T2' ? T2_PROGRESSION : T3_PROGRESSION;

        if (pastLogs.length > 0) {
            // Find the true working weight by looking at the max of the last 3 entries 
            // This prevents warmup sets or deloads from tanking the logic.
            const recentLogs = pastLogs.slice(0, 3);
            const maxRecentWeight = Math.max(...recentLogs.map(l => parseFloat(l.weight) || 45));
            const lastLog = recentLogs.find(l => (parseFloat(l.weight) || 45) === maxRecentWeight) || pastLogs[0];

            const lastWeight = maxRecentWeight;
            const lastSets = parseFloat(lastLog.sets) || 0;
            const lastReps = parseFloat(lastLog.reps) || 0;

            const failed = lastLog.notes?.toLowerCase().includes('fail') || false;

            // Find current stage based on last logged REPS (sets can vary if they end early)
            currentStageIdx = progArray.findIndex(p => p.reps === lastReps);
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

        if (normalizeExerciseName(ex) === CANONICAL_EXERCISES.PULLUPS) {
            const pullupLogs = history
                .filter(l => matchesExercise(l.exercise, CANONICAL_EXERCISES.PULLUPS))
                .filter(l => !l.notes?.toLowerCase().includes('deload') && !l.notes?.toLowerCase().includes('1rm test'));

            let repeatWeight = 0;
            if (pullupLogs.length > 0) {
                // Max weight at the SAME tier — no +5 progression, no deload contamination
                const tierSpecific = pullupLogs.filter(l => detectTier(parseFloat(l.reps) || 0) === tier);
                if (tierSpecific.length > 0) {
                    repeatWeight = Math.max(...tierSpecific.map(l => parseFloat(l.weight) || 0));
                } else {
                    // No tier-specific history — use most recent non-deload pullup
                    const sorted = [...pullupLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    repeatWeight = parseFloat(sorted[0].weight) || 0;
                }
            }
            return {
                exercise: 'Pullups',
                targetWeight: repeatWeight,
                targetSets: progArray[currentStageIdx].sets,
                targetReps: progArray[currentStageIdx].reps,
                tier: tier,
                restSeconds: 120
            };
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
    if (t1PullupDay) planSets.push(getTarget('Pullups', 'T1'));

    // T2
    planSets.push(getTarget(t2Exercise, 'T2'));
    if (!t1PullupDay) planSets.push(getTarget('Pullups', 'T2'));

    return {
        dayName: `Day ${nextDay}: ${t1Exercise}`,
        sets: planSets
    };
}
