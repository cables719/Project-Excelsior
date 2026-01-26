
export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
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

export interface DataContext {
    weighIns: WeighIn[];
    lifts: Lift[];
    cardio: Cardio[];
    nutrition: Nutrition[];
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
    customSystemPrompt?: string;
    [key: string]: unknown;
}
