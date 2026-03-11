import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { normalizeExerciseName } from '@/lib/exercise-aliases';
import { Lift } from '@/lib/types';

export const maxDuration = 60;

function getContext(lifts: Lift[]): string {
    if (!lifts || lifts.length === 0) return "No prior lift data.";

    const exercises: { [key: string]: Lift[] } = {};
    lifts.forEach(lift => {
        const name = normalizeExerciseName(lift.exercise);
        if (!exercises[name]) exercises[name] = [];
        exercises[name].push(lift);
    });

    // Provide the last session for the top 10 most frequent exercises
    const summaries: string[] = [];
    Object.entries(exercises)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 10)
        .forEach(([name, history]) => {
            const sorted = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const lastSession = sorted[0];
            const maxWeight = history.reduce((max, curr) => Math.max(max, parseFloat(curr.weight) || 0), 0);
            summaries.push(`- ${name}: Max ${maxWeight}lb | Last: ${lastSession.weight}lb (${lastSession.sets}x${lastSession.reps}) on ${lastSession.date}`);
        });

    return summaries.join('\n');
}

export async function POST(req: Request) {
    try {
        const { blueprint, constraints, lifts, clientDate } = await req.json();

        if (!blueprint) {
            return new Response('Missing blueprint', { status: 400 });
        }

        const liftContext = getContext(lifts || []);

        const systemPrompt = `
You are an expert fitness coach responsible for translating a user's "Workout Plan" into a concrete, single-day workout plan.

### THE BLUEPRINT (Rules & Schedule)
${blueprint}

### RECENT HISTORICAL CONTEXT
${liftContext}

### CURRENT CONTEXT
Date: ${clientDate || new Date().toLocaleDateString('en-US')}
User Constraints/Requests for Today: ${constraints || 'None'}

### YOUR TASK
Based strictly on the Blueprint rules, the user's recent lift history, and their constraints for today, generate a specific, actionable workout.
Determine what day of their split they should be on, what exercises they need to do, and give specific rep/set targets.

**Progressive Overload (If Applicable):** 
Examine the "RECENT HISTORICAL CONTEXT". If the user's Blueprint rules indicate progressive overload, or if it makes sense based on their recent successful lifts and constraints, suggest slightly heavier target weights or more volume. Do not force this if their constraints or plan say otherwise.

Return a JSON object with:
1. "title": A catchy, short title for today's mission (e.g., "Heavy Lower Body", "Active Recovery Day", "Upper Push").
2. "rationale": A brief explanation (2-3 sentences max) to the user explaining WHY you prescribed this workout, referencing their constraints and previous logs if applicable.
3. "exercises": A list of exercises for today.
    - "name": The exercise name.
    - "reps": The set/rep prescription (e.g., "3x5", "4x8-12", "3x20s hold").
`;

        const { object } = await generateObject({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            schema: z.object({
                title: z.string().describe("A catchy title for the workout"),
                rationale: z.string().describe("Explanation for why you chose this workout"),
                exercises: z.array(z.object({
                    name: z.string().describe("Name of the exercise"),
                    reps: z.string().describe("Rep and set prescription")
                })).describe("List of exercises to perform")
            }),
            messages: [
                { role: 'user', content: 'Design my workout for today based on my blueprint.' }
            ]
        });

        return new Response(JSON.stringify(object), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Blueprint Generation Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to generate blueprint workout' }), { status: 500 });
    }
}
