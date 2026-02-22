import { expect, test, describe } from 'vitest';
import { predictNextWorkout } from './gzclp-engine';
import { Lift } from './types';

describe('GZCLP Engine', () => {
    test('predicts Day B when last T1 is Squat', () => {
        const history: Lift[] = [
            { date: '2025-02-01', exercise: 'Squat', sets: '5', reps: '3', weight: '200', notes: '' }
        ];
        const plan = predictNextWorkout(history);
        expect(plan.dayName).toContain('Day B');
        expect(plan.sets.length).toBeGreaterThan(0);
        expect(plan.sets[0].exercise).toBe('Overhead Press');
    });

    test('increments weight on success for T1', () => {
        const history: Lift[] = [
            { date: '2025-02-01', exercise: 'Squat', sets: '5', reps: '3', weight: '200', notes: 'felt good' }
        ];
        // If last T1 was Squat, the next Squat will be on Day C (T2) or Day A (T1).
        // Let's force Day A by making last T1 Deadlift.
        const historyDayA: Lift[] = [
            { date: '2025-02-01', exercise: 'Deadlift', sets: '5', reps: '3', weight: '300', notes: '' },
            { date: '2025-01-28', exercise: 'Squat', sets: '5', reps: '3', weight: '200', notes: '' } // T1 Squat earlier
        ];
        const plan = predictNextWorkout(historyDayA);

        // Next day is A, T1 is Squat. Should be 205 lbs because it increments by 5
        const squatSet = plan.sets.find(s => s.exercise === 'Squat');
        expect(squatSet).toBeDefined();
        expect(squatSet?.targetWeight).toBe(205);
        expect(squatSet?.targetSets).toBe(5);
        expect(squatSet?.targetReps).toBe(3);
    });

    test('progresses stages on failure for T1', () => {
        const historyDayA: Lift[] = [
            { date: '2025-02-01', exercise: 'Deadlift', sets: '5', reps: '3', weight: '300', notes: '' },
            { date: '2025-01-28', exercise: 'Squat', sets: '5', reps: '3', weight: '200', notes: 'Fail (completed 2/3 on set 5)' }
        ];
        const plan = predictNextWorkout(historyDayA);

        // Next day is A, T1 is Squat. Failed 5x3, so it should move to 6x2 (stage index 1).
        // Weight stays the same.
        const squatSet = plan.sets.find(s => s.exercise === 'Squat');
        expect(squatSet?.targetWeight).toBe(200); // Does not increment
        expect(squatSet?.targetSets).toBe(6);
        expect(squatSet?.targetReps).toBe(2);
    });

    test('pullups inherit the target sets and reps of their tier', () => {
        const history: Lift[] = [
            { date: '2025-02-01', exercise: 'Deadlift', sets: '5', reps: '3', weight: '300', notes: '' }, // Triggers Day A
            { date: '2025-01-28', exercise: 'Pullups', sets: '3', reps: '10', weight: '30', notes: 'Fail' }
        ];
        const plan = predictNextWorkout(history);

        // Day A is T1 Pullup Day. Because last Pullups failed at 10 reps (which indicates T2 stage maybe? but Pullups have independent progression).
        // Wait, Pullup progression looks at Pullup history REPS to find stage!
        // If last Pullups was 10 reps, that matches T2 stage 0 or T1 stage 0? Actually T2 3x10.
        // But if Pullups is assigned to T1 today, it uses T1_PROGRESSION.
        // It's a bit of a quirk of the engine. But it should have T1 progression sets/reps.
        const pullupSet = plan.sets.find(s => s.exercise === 'Pullups');
        expect(pullupSet).toBeDefined();
        expect(pullupSet?.tier).toBe('T1');
        // Let's just check it doesn't default to 3x10 if it's in a T1 slot and history was random.
        // Actually, T1 stage 0 is 5x3. Since history reps was 10, findIndex for T1_PROGRESSION returns -1, so it defaults to stage 0 (5x3).
        expect(pullupSet?.targetSets).toBe(5);
        expect(pullupSet?.targetReps).toBe(3);
        // Weight should be max history weight (30).
        expect(pullupSet?.targetWeight).toBe(30);
    });
});
