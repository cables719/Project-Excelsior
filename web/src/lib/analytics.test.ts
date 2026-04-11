import { expect, test, describe } from 'vitest';
import { calculateTDEE, calculateNetCalories, parseLiftPerformance, LiftPoint } from './analytics';
import { Lift } from './types';

describe('Analytics Math Engine', () => {
    describe('calculateTDEE', () => {
        test('uses tdeeOverride if provided, ignoring everything else', () => {
            expect(calculateTDEE(200, 2000, 3000, 1.2)).toBe(3000);
            expect(calculateTDEE(undefined, undefined, 2500, undefined)).toBe(2500);
        });

        test('uses bmrOverride and activityLevel if no tdeeOverride', () => {
            // bmr = 2000, activity = 1.5 -> 3000
            expect(calculateTDEE(150, 2000, undefined, 1.5)).toBe(3000);
            // Default activity is 1.2 -> 2400
            expect(calculateTDEE(150, 2000, undefined, undefined)).toBe(2400);
        });

        test('estimates BMR from weight if no overrides exist', () => {
            // weight 200 * 11 = 2200 BMR. * 1.2 activity = 2640 TDEE
            expect(calculateTDEE(200, undefined, undefined, undefined)).toBe(2640);
        });

        test('defaults to 2000 BMR if no data is provided at all', () => {
            // 2000 * 1.2 = 2400
            expect(calculateTDEE(undefined, undefined, undefined, undefined)).toBe(2400);
        });
    });

    describe('calculateNetCalories', () => {
        test('calculates net correctly when burn is not included in budget', () => {
            const tdee = 2500;
            const caloriesIn = 2000;
            const activityBurn = 500;
            // Budget is just TDEE (2500). 2500 - 2000 = 500 left over
            expect(calculateNetCalories(tdee, caloriesIn, activityBurn, false)).toBe(500);

            // Overeating
            expect(calculateNetCalories(2000, 2500, 500, false)).toBe(-500);
        });

        test('calculates net correctly when burn IS included in budget', () => {
            const tdee = 2500;
            const caloriesIn = 2000;
            const activityBurn = 500;
            // Budget is TDEE + Burn (3000). 3000 - 2000 = 1000 left over
            expect(calculateNetCalories(tdee, caloriesIn, activityBurn, true)).toBe(1000);
        });
    });

    describe('parseLiftPerformance', () => {
        const createLift = (sets: string, reps: string, notes: string): Lift => ({
            date: '4/09', exercise: 'Bench', weight: '250', sets, reps, notes
        });

        test('handles standard explicit sequence', () => {
            const p = parseLiftPerformance(createLift('6', '2', 'Fail; 1/1/1/1/1/0'));
            expect(p.isFail).toBe(true);
            expect(p.maxCompletedReps).toBe(1);
            expect(p.totalCompletedReps).toBe(5);
        });

        test('handles user provided case 1 (Active mode + Manual sequence)', () => {
            const p = parseLiftPerformance(createLift('5', '3', 'Fail (completed 1/3 on set 5) | Failure: 3/3/2/2/1'));
            expect(p.isFail).toBe(true);
            // The manual sequence 3/3/2/2/1 should take priority
            expect(p.maxCompletedReps).toBe(3);
            expect(p.totalCompletedReps).toBe(11);
        });

        test('handles user provided case 2 (Active mode only fallback)', () => {
            // target was say 3 sets of 2
            const p = parseLiftPerformance(createLift('3', '2', 'Fail (completed 1/1 on set 3) | Failed on #3, switched to 135 lb.'));
            expect(p.isFail).toBe(true);
            // active mode: completed 1 on set 3. So sets 1,2 were target (2 reps).
            // manual sequence has no explicit full sequence, only "#3" and "135".
            // So fallback to Active Mode: Math.max(targetReps (2), 1) = 2.
            // Total = 2 + 2 + 1 = 5.
            expect(p.maxCompletedReps).toBe(2);
            expect(p.totalCompletedReps).toBe(5);
        });

        test('handles explicit fail without any numbers', () => {
            const p = parseLiftPerformance(createLift('3', '5', 'Fail'));
            expect(p.isFail).toBe(true);
            expect(p.maxCompletedReps).toBe(0);
            expect(p.totalCompletedReps).toBe(0);
        });

        test('handles implicit failure found only via manual notes', () => {
            const p = parseLiftPerformance(createLift('3', '5', 'felt hard today. 5/5/4'));
            expect(p.isFail).toBe(true);
            expect(p.maxCompletedReps).toBe(5);
            expect(p.totalCompletedReps).toBe(14);
        });
    });
});
