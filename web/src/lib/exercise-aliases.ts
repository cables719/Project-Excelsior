/**
 * Exercise Name Normalization
 * 
 * A single source of truth for canonical exercise names.
 * Maps common variations → canonical form so graphs, analytics,
 * and GZCLP logic all agree on what "Bench" means.
 */

// Canonical names used throughout the app
export const CANONICAL_EXERCISES = {
    SQUAT: 'Squat',
    BENCH: 'Bench',
    OHP: 'OHP',
    DEADLIFT: 'Deadlift',
    PULLUPS: 'Pullups',
} as const;

// Map of lowercase variations → canonical name
const ALIAS_MAP: Record<string, string> = {
    // Squat
    'squat': CANONICAL_EXERCISES.SQUAT,
    'back squat': CANONICAL_EXERCISES.SQUAT,
    'barbell squat': CANONICAL_EXERCISES.SQUAT,
    'bb squat': CANONICAL_EXERCISES.SQUAT,

    // Bench
    'bench': CANONICAL_EXERCISES.BENCH,
    'bench press': CANONICAL_EXERCISES.BENCH,
    'barbell bench': CANONICAL_EXERCISES.BENCH,
    'barbell bench press': CANONICAL_EXERCISES.BENCH,
    'flat bench': CANONICAL_EXERCISES.BENCH,
    'flat bench press': CANONICAL_EXERCISES.BENCH,
    'bb bench': CANONICAL_EXERCISES.BENCH,

    // OHP
    'ohp': CANONICAL_EXERCISES.OHP,
    'overhead press': CANONICAL_EXERCISES.OHP,
    'overhead': CANONICAL_EXERCISES.OHP,
    'press': CANONICAL_EXERCISES.OHP,
    'shoulder press': CANONICAL_EXERCISES.OHP,
    'barbell press': CANONICAL_EXERCISES.OHP,
    'military press': CANONICAL_EXERCISES.OHP,

    // Deadlift
    'deadlift': CANONICAL_EXERCISES.DEADLIFT,
    'dlift': CANONICAL_EXERCISES.DEADLIFT,
    'dead': CANONICAL_EXERCISES.DEADLIFT,
    'conventional deadlift': CANONICAL_EXERCISES.DEADLIFT,
    'barbell deadlift': CANONICAL_EXERCISES.DEADLIFT,
    'bb deadlift': CANONICAL_EXERCISES.DEADLIFT,

    // Pullups
    'pullups': CANONICAL_EXERCISES.PULLUPS,
    'pullup': CANONICAL_EXERCISES.PULLUPS,
    'pull-up': CANONICAL_EXERCISES.PULLUPS,
    'pull-ups': CANONICAL_EXERCISES.PULLUPS,
    'pull up': CANONICAL_EXERCISES.PULLUPS,
    'pull ups': CANONICAL_EXERCISES.PULLUPS,
    'chin-up': CANONICAL_EXERCISES.PULLUPS,
    'chin-ups': CANONICAL_EXERCISES.PULLUPS,
    'chinup': CANONICAL_EXERCISES.PULLUPS,
    'chinups': CANONICAL_EXERCISES.PULLUPS,
    'chin up': CANONICAL_EXERCISES.PULLUPS,
    'chin ups': CANONICAL_EXERCISES.PULLUPS,
};

/**
 * Normalize an exercise name to its canonical form.
 * If no alias is found, returns the original name trimmed.
 * 
 * Examples:
 *   "Bench Press" → "Bench"
 *   "dlift" → "Deadlift"
 *   "OHP" → "OHP"
 *   "Goblet Squat" → "Goblet Squat" (no match — returned as-is)
 */
export function normalizeExerciseName(raw: string): string {
    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();

    // Direct match
    if (ALIAS_MAP[lower]) {
        return ALIAS_MAP[lower];
    }

    return trimmed;
}

/**
 * Check if two exercise names refer to the same canonical exercise.
 */
export function isSameExercise(a: string, b: string): boolean {
    return normalizeExerciseName(a) === normalizeExerciseName(b);
}

/**
 * Check if a logged exercise name matches a target canonical exercise.
 * This replaces the ad-hoc `includes()` checks scattered throughout the codebase.
 */
export function matchesExercise(loggedName: string, canonicalTarget: string): boolean {
    const normalizedLogged = normalizeExerciseName(loggedName);
    const normalizedTarget = normalizeExerciseName(canonicalTarget);

    // Exact match after normalization
    if (normalizedLogged === normalizedTarget) return true;

    // Fallback: the logged name contains the canonical target (for accessories like "Close Grip Bench")
    // But we explicitly exclude known different exercises
    const lower = loggedName.toLowerCase();
    const targetLower = canonicalTarget.toLowerCase();

    // Special exclusions to prevent false positives
    if (normalizedTarget === CANONICAL_EXERCISES.SQUAT) {
        return lower.includes('squat') && !lower.includes('split') && !lower.includes('goblet') && !lower.includes('bulgarian');
    }
    if (normalizedTarget === CANONICAL_EXERCISES.BENCH) {
        return lower.includes('bench') && !lower.includes('dumbbell') && !lower.includes('db') && !lower.includes('incline') && !lower.includes('decline');
    }
    if (normalizedTarget === CANONICAL_EXERCISES.OHP) {
        return lower.includes('ohp') || lower.includes('overhead') || (lower === 'press') || lower.includes('military press');
    }
    if (normalizedTarget === CANONICAL_EXERCISES.DEADLIFT) {
        return (lower.includes('dead') || lower.includes('dlift')) && !lower.includes('romanian') && !lower.includes('rdl') && !lower.includes('stiff');
    }
    if (normalizedTarget === CANONICAL_EXERCISES.PULLUPS) {
        return lower.includes('pullup') || lower.includes('pull-up') || lower.includes('pull up') || lower.includes('chin');
    }

    return lower.includes(targetLower);
}
