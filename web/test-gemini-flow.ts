import { fetchContext } from './src/lib/data';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGeminiFlow() {
    console.log('1. Fetching data from Google Sheets...');
    let contextString = '';
    try {
        const data = await fetchContext();
        contextString = data.formattedString;
        console.log('   ✅ Success. Context length:', contextString.length, 'chars');
    } catch (err) {
        console.error('   ❌ Failed to fetch sheets:', err);
        return;
    }

    console.log('\n2. Sending to Google Gemini (Clara 2.0)...');

    const systemPrompt = `
You are Clara.
### DATA
${contextString}
### INSTRUCTION
Summarize the user's recent progress in 1 sentence.
`;

    try {
        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            prompt: "How am I doing?",
        });

        console.log('   ✅ Success. Clara says:');
        console.log('   --------------------------------------------------');
        console.log('   ' + text);
        console.log('   --------------------------------------------------');
    } catch (err) {
        console.error('   ❌ Failed to contact Gemini:', err);
    }
}

testGeminiFlow();
