import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testStream() {
    console.log('Testing Gemini Stream...');

    try {
        const result = streamText({
            model: google('gemini-2.5-flash'),
            prompt: 'Count to 10 quickly.',
        });

        console.log('Stream started. Reading chunks:');

        for await (const chunk of result.textStream) {
            process.stdout.write(chunk);
        }
        console.log('\n\n✅ Stream complete.');
    } catch (err) {
        console.error('❌ Stream failed:', err);
    }
}

testStream();
