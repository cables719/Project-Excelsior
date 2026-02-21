
// Re-trigger build 2
export const TYPES_VERSION = "1.0";
export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    images?: string[];
}

export interface WeighIn {
    date: string;
    weight: string;
    bodyFat: string;
    notes: string;
}

export interface Lift {
    date: string;
    exercise: string;
    sets: string;
    reps: string;
    weight: string;
    notes: string;
}

export interface Cardio {
    date: string;
    activity: string;
    duration: string;
    distance: string;
    heartRate: string;
    notes: string;
}

export interface Nutrition {
    date: string;
    time: string;
    item: string;
    calories: string;
    protein: string;
    notes: string;
}

export interface EaglesPeakLog {
    date: string;
    ascentTime: string;
    overallTime: string;
    averagePace: string;
    averageHR: string;
    maxHR: string;
    zone5: string;
    zone4: string;
    zone3: string;
    zone2: string;
    calories: string;
    notes: string;
}

export interface HydrationLog {
    date: string;
    time: string;
    amount: string; // stored as string in sheets typically, parsed to number
    source: string;
}

export interface WellnessLog {
    date: string;
    mood: string; // 1-5
    energy: string; // 1-5
    notes: string;
}

export interface DataContext {
    weighIns: WeighIn[];
    lifts: Lift[];
    cardio: Cardio[];
    nutrition: Nutrition[];
    eaglesPeakLogs: EaglesPeakLog[];
    hydrationLogs: HydrationLog[];
    wellnessLogs: WellnessLog[];
    userProfile?: UserProfile; // New optional profile
    formattedString: string;
    [key: string]: unknown;
}

export interface UserProfile {
    name?: string;
    sex?: 'M' | 'F';
    age?: number;
    height?: number; // cm
    goalWeight?: number;
    goalBodyFat?: number;
    activityLevel?: number; // 1.2 to 1.9
    currentWeight?: number;
    currentBodyFat?: number;
    coachMode?: 'clara' | 'cole' | 'atlas' | 'ember';
    coachAttributes?: {
        warmth: number; // 0-1
        intensity: number; // 0-1
        verbosity: number; // 0-1
    };
    bmrOverride?: number;
    proteinOverride?: number;
    otherGoals?: string;
    // Customization
    userAvatar?: string;
    customCoachName?: string;
    customCoachAvatar?: string;

    // New Preferences
    preferences?: {
        hideCardio?: boolean;
        hideLifts?: boolean;
        hideBodyFat?: boolean;
        hideNutrition?: boolean;
        showEaglesPeak?: boolean;
        showWellness?: boolean;
        hydrationTarget?: number; // oz
    };
    [key: string]: unknown;
}
