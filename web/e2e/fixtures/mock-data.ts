/**
 * Mock fixtures for E2E tests.
 * These intercept all API routes so that NO real data is ever read or written.
 */

export const MOCK_USER_PROFILE = {
    name: 'Test User',
    sex: 'M',
    age: 30,
    height: 175,
    goalWeight: 185,
    goalBodyFat: 15,
    activityLevel: 1.55,
    currentWeight: 195,
    currentBodyFat: 18,
    coachMode: 'clara',
    preferences: {
        enableGZCLP: true,
        enableEaglesPeak: false,
    },
};

export const MOCK_WEIGH_INS = [
    { date: '2/20/2026', weight: '195.0', bodyFat: '18', notes: '' },
    { date: '2/19/2026', weight: '194.6', bodyFat: '18', notes: '' },
    { date: '2/18/2026', weight: '195.2', bodyFat: '18.2', notes: '' },
];

export const MOCK_LIFTS = [
    // Last T1 was Deadlift -> Next day is A (Squat)
    { date: '2/19/2026', exercise: 'Deadlift', sets: '5', reps: '3', weight: '300', notes: '' },
    { date: '2/17/2026', exercise: 'Squat', sets: '5', reps: '3', weight: '285', notes: '' },
    { date: '2/15/2026', exercise: 'Overhead Press', sets: '5', reps: '3', weight: '135', notes: '' },
    { date: '2/13/2026', exercise: 'Bench Press', sets: '5', reps: '3', weight: '200', notes: '' },
    { date: '2/15/2026', exercise: 'Pullups', sets: '5', reps: '3', weight: '25', notes: '' },
];

export const MOCK_CARDIO = [
    { date: '2/20/2026', activity: 'Eagles Peak Hike', duration: '120', distance: '7', heartRate: '155', notes: '' },
];

export const MOCK_NUTRITION = [
    { date: new Date().toLocaleDateString('en-US'), time: '08:00', item: 'Oatmeal with Protein', calories: '450', protein: '35', notes: '' },
    { date: new Date().toLocaleDateString('en-US'), time: '12:30', item: 'Chicken Rice Bowl', calories: '650', protein: '45', notes: '' },
];

export const MOCK_DATA_RESPONSE = {
    weighIns: MOCK_WEIGH_INS,
    lifts: MOCK_LIFTS,
    cardio: MOCK_CARDIO,
    nutrition: MOCK_NUTRITION,
    eaglesPeakLogs: [],
    hydrationLogs: [],
    wellnessLogs: [],
    userProfile: MOCK_USER_PROFILE,
};
