import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
    const { text, image } = await req.json();

    if (!text && !image) {
        return new Response('Missing input (text or image)', { status: 400 });
    }

    const systemPrompt = `
    You are a nutrition analyzer.
    The user will send you a text description AND/OR a photo of food they ate.
    You must estimate the Calories and Protein (g) for this entry.

    GUIDELINES:
    - **Visual Estimation**: If an image is provided, estimate portion sizes based on visual cues (plate size, thickness).
    - **Use Standard References**: Check standard database values (USDA etc) rather than guessing. 
    - **Assume Moderate/Standard Portions**: Unless the user specifies "Restaurant", "Large", or "Feast", assume a standard home-cooked serving size.
       - "Burger" -> Standard ~500-600 cal (not a pub style 1000+ cal bomb unless specified).
       - "Steak" -> Standard 6-8oz portion.
       - "Pasta/Stroganoff" -> Standard bowl (~600-750 cal), not a trough.
    - **Protein Reality (BE CONSERVATIVE)**:
       - **"Protein" labeled items**: Do NOT assume best-case scenario. A "Protein Yogurt" is often 12-15g. Use averages.
       - **Meat**: Cooked beef is ~7g protein per oz.
       - **Impossible Totals**: If a single meal exceeds 1000 Calories or 80g Protein, **VERIFY** if this is reasonable. If unsure/ambiguous, lean towards the conservative (lower) estimate.
    
    Return ONLY a raw JSON object (no markdown, no backticks) with this structure:
    {
        "reasoning": "Brief explanation of how you calculated the totals involved (mentioning visual cues if applicable)",
        "calories": number,
        "protein": number,
        "item_name": "Short descriptive summary"
    }
    `;

    try {
        const userMessage = {
            role: 'user',
            content: [] as any[]
        };

        if (text) {
            userMessage.content.push({ type: 'text', text });
        } else {
            // If no text, provide a default prompt so it knows what to do with the image
            userMessage.content.push({ type: 'text', text: "Analyze this food image." });
        }

        if (image) {
            // "image" is expected to be a base64 data URL (e.g. "data:image/jpeg;base64,...")
            // The AI SDK's "image" type handles data URLs or URLs.
            userMessage.content.push({ type: 'image', image });
        }

        const { text: jsonResult } = await generateText({
            model: google('gemini-2.5-flash'), // Using Flash 2.5 for stability and speed
            system: systemPrompt,
            messages: [userMessage as any], // Cast to any to satisfy TS strictness if needed
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
