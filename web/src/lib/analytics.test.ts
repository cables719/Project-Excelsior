import { expect, test, describe } from 'vitest';
import { calculateTDEE, calculateNetCalories } from './analytics';

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
});
