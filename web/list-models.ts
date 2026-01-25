import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listModels() {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key) {
        console.error('No API Key found');
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            console.error('API Error:', JSON.stringify(data.error, null, 2));
        } else {
            if (!data.models) {
                console.log('No models found in response.');
                return;
            }
            const textModels = data.models
                .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
                .map((m: { name: string }) => m.name);

            console.log('--- VALID TEXT MODELS ---');
            textModels.forEach((m: string) => console.log(m));
            console.log('-------------------------');
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

listModels();
