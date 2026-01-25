import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
    const { text } = await req.json();

    if (!text) {
        return new Response('Missing text', { status: 400 });
    }

    const systemPrompt = `
    You are a nutrition analyzer.
    The user will send you a text description of food they ate.
    You must estimate the Calories and Protein (g) for this entry.

    GUIDELINES:
    - **Use Standard References**: Check standard database values (USDA etc) rather than guessing. 
    - **Restaurant Portions**: Assume restaurant portions are larger/heavier than home cooking.
       - A "Burger" is rarely under 800 cals in a restaurant.
       - "Steak" usually involves butter/oil.
    - **Protein Reality (BE CONSERVATIVE)**:
       - **"Protein" labeled items**: Do NOT assume best-case scenario. a "Protein Yogurt" is often 12-15g, not always 25g. Unless brand is specified, use the average.
       - **Shakes**: Standard scoop is ~22-25g. If user says "~30g" for "2x shakes", clarify if they mean TOTAL or EACH. If ambiguous, assume standard commercial values (~25g each).
       - **Meat**: Cooked beef is ~7g protein per oz.
       - **"Big Serving"**: This implies more Calories (fats/carbs) more than it implies massive Protein scaling. Scale calories by 1.5x, but protein only by 1.2x.
       - **Impossible Totals**: If a single meal exceeds 150g protein, you are likely overestimating. Sanity check: 200g protein = 2 lbs of steak. Did they eat that? Likely not.
       - **Vegetables**: Brussels sprouts/broccoli have negligible protein in normal serving sizes (e.g. 3-5g). Do not pad totals with them.
    
    Return ONLY a raw JSON object (no markdown, no backticks) with this structure:
    {
        "reasoning": "Brief explanation of how you calculated the totals",
        "calories": number,
        "protein": number,
        "item_name": "Short descriptive summary"
    }
    `;

    try {
        const { text: jsonResult } = await generateText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            prompt: text,
        });

        // Clean up any markdown if the model hallucinates it despite instructions
        const cleanJson = jsonResult.replace(/```json/g, '').replace(/```/g, '').trim();

        return new Response(cleanJson, {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Analysis Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to analyze' }), { status: 500 });
    }
}
