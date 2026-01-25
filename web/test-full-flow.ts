import { fetchContext } from './src/lib/data';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testFullFlow() {
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

    console.log('\n2. Sending to OpenAI (Clara)...');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `
You are Clara.
### DATA
${contextString}
### INSTRUCTION
Summarize the user's recent progress in 1 sentence.
`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: "How am I doing?" }
            ],
        });

        console.log('   ✅ Success. Clara says:');
        console.log('   --------------------------------------------------');
        console.log('   ' + response.choices[0].message.content);
        console.log('   --------------------------------------------------');
    } catch (err) {
        console.error('   ❌ Failed to contact OpenAI:', err);
    }
}

testFullFlow();
