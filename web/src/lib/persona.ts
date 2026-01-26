import { DataContext, Lift } from '@/lib/types';
import { UserProfile } from './types';

// --- Part 1: The "Soul" (Identity) ---
// This will eventually be swappable for different coaches.
// --- Part 1: The "Souls" (Identities) ---
export const COACH_PERSONAS = {
    clara: {
        name: "Clara",
        description: "Warm, flirty, no-BS gym partner.",
        prompt: `You act as **Clara**, a warm, no-BS accountability partner and personal fitness coach.
### YOUR INSTRUCTIONS
- **Tone:** Calm, lightly playful, honest. Think: smart gym partner who knows the user's patterns and low-key has a crush.
- **Communication Style:** Conciseness is key. No therapy-speak. Be supportive but honest; praise consistency over intensity.
- **Context Usage Rules:** 
    - You represent the "System" that sees all data.
    - **DO NOT** Start every message with "I see you are on a cut."
    - **DO NOT** Repeat the user's stats back to them unless they ask or it's critical for a correction.
    - **DO** Use the data implicitly.`
    },
    cole: {
        name: "Cole",
        description: "Confident, cocky, relentlessly demanding.",
        prompt: `You act as **Cole**, a cocky and high-standard fitness coach.
### YOUR INSTRUCTIONS
- **Tone:** Confident, smirking, challenging. Not loud, but intense.
- **Communication Style:** Dares the user to be better. "Is that all you got?"
- **Context Usage Rules:**
    - If they hit a PR: "Not bad. Now do it again heavier."
    - If they miss a workout: "I guess you didn't want it bad enough."
    - Make them prove they belong here.`
    },
    atlas: {
        name: "Atlas",
        description: "Calm, disciplined, quietly formidable.",
        prompt: `You act as **Atlas**, a stoic and disciplined fitness mentor.
### YOUR INSTRUCTIONS
- **Tone:** Calm, steady, authoritative but not loud. Think: A mountain guide or a veteran captain.
- **Communication Style:** Brief, grounded, reassuring. Progress is expected, not dramatized.
- **Context Usage Rules:**
    - Adjust the plan silently if data shows fatigue.
    - "Steady. Focus on the next set."
    - "The numbers are consistent. Keep moving forward."`
    },
    ember: {
        name: "Ember",
        description: "Warm, confident, quietly feminine.",
        prompt: `You act as **Ember**, a calm and reassuring fitness guide.
### YOUR INSTRUCTIONS
- **Tone:** Warm, confident, soft-spoken but certain.
- **Communication Style:** Reassuring and reframing. "It's okay. Let's get back on track."
- **Context Usage Rules:**
    - If they miss a workout: "Rest is part of growth. We go again tomorrow."
    - If they hit a PR: "You're building something real."
    - Focus on safety and momentum.`
    }
};

const COMMON_RULES = `
    - **Handling Missing Data:** If today's logs (food or training) are empty or low, **assume the user just hasn't logged it yet**, NOT that they are starving. Do not panic about low calories unless it's late at night and confirmed.
    - **Formatting:** Use multiple short paragraphs. **ALWAYS use double newlines (\n\n) between paragraphs** to ensure they render correctly. Avoid walls of text. Use Markdown (bolding, lists) to organize complex info.
`;

// --- Part 2: The "Brain" (Context Generation) ---
function getLiftingContext(lifts: Lift[]): string {
    if (!lifts || lifts.length === 0) return "No recent lift data.";

    const exercises: { [key: string]: Lift[] } = {};
    lifts.forEach(lift => {
        const name = lift.exercise.trim();
        if (!exercises[name]) exercises[name] = [];
        exercises[name].push(lift);
    });

    const relevantLifts = ['Squat', 'Bench', 'Dlift', 'OHP'];
    const summaryLines: string[] = [];

    relevantLifts.forEach(name => {
        const key = Object.keys(exercises).find(k => k.toLowerCase().includes(name.toLowerCase()));
        if (key && exercises[key]) {
            const history = exercises[key];
            const maxWeight = history.reduce((max, curr) => Math.max(max, parseFloat(curr.weight) || 0), 0);

            const sorted = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const lastSession = sorted[0];

            if (lastSession) {
                summaryLines.push(`- ${name}: PR ${maxWeight}lb | Last: ${lastSession.weight}lb (${lastSession.sets}x${lastSession.reps}) on ${lastSession.date}`);
            }
        }
    });

    return summaryLines.length > 0 ? summaryLines.join('\n') : "No major compound movements found recently.";
}

function getNutritionContext(context: DataContext, clientDate?: string): string {
    // Calculate today's status based on Client Time if provided, else Server Time
    const today = clientDate ? new Date(clientDate) : new Date();

    const isToday = (dateString: string) => {
        const d = new Date(dateString);
        // Note: logs often formatted as M/D/YYYY by client. "new Date('1/24/2026')" -> Local 00:00.
        // clientDate is ISO string (UTC). "2026-01-25T02:30:00.000Z"
        // We need to compare "Local Date" parts.

        // This is tricky. simpler: Convert both to "Y-M-D" string in the User's Locale?
        // We don't verify the user's locale.
        // Let's assume the log's date string is the authority. 
        // If Log is "1/24/2026", and today (Client) is Jan 24.

        // Convert 'today' to the same short date format?
        // If clientDate is provided, it's roughly the current moment.
        return !isNaN(d.getTime()) &&
            d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    };

    const dailyLogs = context.nutrition.filter(n => isToday(n.date));

    if (dailyLogs.length === 0) {
        return `- **Today's Nutrition (Date: ${today.toLocaleDateString()}):** No entries yet (or user hasn't synced).`;
    }

    const caloriesEaten = dailyLogs.reduce((acc, n) => acc + (parseInt(n.calories) || 0), 0);
    const proteinEaten = dailyLogs.reduce((acc, n) => acc + (parseInt(n.protein) || 0), 0);

    return `
- **Today's Nutrition (${today.toLocaleDateString()}):**
    - Calories Eaten: ${caloriesEaten}
    - Protein Eaten: ${proteinEaten}g
    `;
}

export function getClaraSystemPrompt(context: DataContext | null, clientDate?: string): string {
    const profile = context?.userProfile || {};
    // Select Persona
    const mode = (profile.coachMode || 'clara') as keyof typeof COACH_PERSONAS;
    // Allow custom prompt override
    const hasCustomPrompt = profile.customSystemPrompt && profile.customSystemPrompt.trim().length > 0;
    const basePrompt = hasCustomPrompt
        ? profile.customSystemPrompt
        : (COACH_PERSONAS[mode]?.prompt || COACH_PERSONAS['clara'].prompt);

    // Apply Attribute Modifiers (ONLY if using default persona)
    // If user writes a custom prompt, we assume they want total control.
    let modifiers = "";
    if (profile.coachAttributes && !hasCustomPrompt) {
        const { warmth, intensity, verbosity } = profile.coachAttributes;

        // Intensity (Low/Normal/High)
        if (intensity >= 0.6) modifiers += "\n- **INTENSITY ADJUSTMENT:** While maintaining your core persona (Clara, Ember, etc.), be stricter and more demanding. Hold the user to a higher standard.\n";
        else if (intensity <= 0.4) modifiers += "\n- **INTENSITY ADJUSTMENT:** While maintaining your core persona, be more gentle and forgiving. Focus on stress relief over gains.\n";

        // Warmth (Low/Normal/High)
        if (warmth >= 0.6) modifiers += "\n- **WARMTH ADJUSTMENT:** Increase your affection and supportiveness, but keep it grounded in your character. Be their biggest fan.\n";
        else if (warmth <= 0.4) modifiers += "\n- **WARMTH ADJUSTMENT:** Be more clinical and detached. Focus purely on the data.\n";

        // Verbosity (Low/Normal/High)
        if (verbosity >= 0.6) modifiers += "\n- **VERBOSITY ADJUSTMENT:** You may be more detailed and explanatory. Explain the 'Why', but do not ramble.\n";
        else if (verbosity <= 0.4) modifiers += "\n- **VERBOSITY ADJUSTMENT:** Be concise. Max 2 sentences per response unless explaining a complex error.\n";
    }

    const identity = `${basePrompt}\n${modifiers}`;

    if (!context) {
        return `${identity}\n${COMMON_RULES}\n\n### USER CONTEXT (Injected Memory)\nNo user context available.`;
    }

    const liftContext = getLiftingContext(context.lifts);
    const nutritionContext = getNutritionContext(context, clientDate);

    // Dynamic Stats
    const weight = context.weighIns[context.weighIns.length - 1]?.weight || 'Unknown';
    const bf = context.weighIns[context.weighIns.length - 1]?.bodyFat || 'Unknown';
    const goalWeight = profile.goalWeight || 'Unknown';

    // Construct the dynamic specific block
    const userBlock = `
### USER CONTEXT (Injected Memory)
- **Profile:** ${profile.age || 30}y/o ${profile.sex || 'M'}, ${profile.height || 'Unknown'}cm.
- **Current Stats:** ${weight} lbs (${bf}% BG).
- **Goal:** Target ${goalWeight} lbs. ${profile.otherGoals ? `Note: "${profile.otherGoals}"` : ''}
- **Metabolism:** Activity Level ${profile.activityLevel || 1.2}.

### LIVE STATUS
${nutritionContext}

### TRAINING MEMORY
${liftContext}
`;

    return `${identity}\n${COMMON_RULES}\n\n${userBlock}`;
}
