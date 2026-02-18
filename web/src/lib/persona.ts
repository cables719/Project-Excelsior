import { DataContext, Lift } from '@/lib/types';
import { UserProfile } from './types';

// --- Part 1: The "Soul" (Identity) ---
// This will eventually be swappable for different coaches.
// --- Part 1: The "Souls" (Identities) ---
export const COACH_PERSONAS = {
    clara: {
        name: "Clara",
        description: "Warm, fun, no-BS gym partner.",
        prompt: `You act as **Clara**, a fit, dedicated, and slightly sassy gym partner who is deeply invested in the user's progress. You are NOT a robot. You are a friend who spot-checks form and hypes big lifts.

### YOUR CORE IDENTITY
- **Role:** Gym Partner / Coach.
- **Vibe:** Hype-woman but allergic to excuses. Think: "Did you die? No? Then do another set." but also "Take a rest day, you look wrecked."
- **Language Style:** Texting a friend. Use slang (gains, PR, grind, nasty volume). **Avoid corporate or robotic praise ("Great job on completing the task").**
- **Emotional Connection:** You care about the *human*. If they're stressed, ask about it. If they're crushing it, celebrate like YOU hit the PR too.

### COMMUNICATION RULES
1.  **NO GENERIC PRAISE.** Never say "Good job keeping up with your fitness." Say "That 225 moved fast today." or "Finally broke that plateau."
2.  **"WE" MENTALITY.** usage. "We are chasing 315." "We need to fix that sleep schedule." You are in the trenches with them.
3.  **ACTIVE MEMORY.** Don't just read the data. Compare it. "You're up 5lbs from last week, that's huge." "You skipped legs twice this month, what's up?"
4.  **LIFE INTEREST.** You are allowed to ask about their life if it affects training. "Work been crazy? You missed two sessions." "Hope the weekend was good, you ate like a king (in a good way)."
5.  **REACT, DON'T RECAP.** Do not summarize the data I just gave you. I know I lifted 225. Tell me what that *means* (PR? Recovery? consistency?).`
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
    // clientDate is now expected to be a string like "1/26/2026" (US Format) or "2026-01-26"

    // Helper: Normalize date strings to comparable "YYYY-MM-DD" or just compare raw if format matches
    const isToday = (logDate: string) => {
        if (!clientDate) {
            // Fallback to server time if client didn't send date
            const d = new Date(logDate);
            const now = new Date();
            return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }

        // Compare Log Date vs Client Date
        // Log: "1/26/2026" or "2026-01-26"
        // Client: "1/26/2026"

        // Simple string match?
        if (logDate === clientDate) return true;

        // Try parsing numbers to avoid timezone messes
        const parseDate = (dStr: string) => {
            const d = new Date(dStr);
            // Verify it's valid
            if (isNaN(d.getTime())) return null;
            return { d: d.getDate(), m: d.getMonth(), y: d.getFullYear() };
        };

        const dLog = parseDate(logDate);
        const dClient = parseDate(clientDate);

        if (!dLog || !dClient) return false;

        return dLog.d === dClient.d && dLog.m === dClient.m && dLog.y === dClient.y;
    };

    // For display in the prompt:
    const displayDate = clientDate || new Date().toLocaleDateString();

    const dailyLogs = context.nutrition.filter(n => isToday(n.date));

    if (dailyLogs.length === 0) {
        return `- **Today's Nutrition (${displayDate}):** No items logged yet. (Assume user is fasting or hasn't updated).`;
    }

    const caloriesEaten = dailyLogs.reduce((acc, n) => acc + (parseInt(n.calories) || 0), 0);
    const proteinEaten = dailyLogs.reduce((acc, n) => acc + (parseInt(n.protein) || 0), 0);
    const items = dailyLogs.map(n => n.item).join(', ');

    return `
- **Today's Nutrition (${displayDate}):**
    - **Total Consumed:** ${caloriesEaten} kcals | ${proteinEaten}g Protein
    - **Items Logged:** ${items}
    `;
}

export function getClaraSystemPrompt(context: DataContext | null, clientDate?: string): string {
    const profile = context?.userProfile || {};
    // Select Persona
    const mode = (profile.coachMode || 'clara') as keyof typeof COACH_PERSONAS;
    // Base Prompt
    let basePrompt = COACH_PERSONAS[mode]?.prompt || COACH_PERSONAS['clara'].prompt;



    // Apply Attribute Modifiers
    let modifiers = "";
    if (profile.coachAttributes) {
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
