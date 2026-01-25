import { fetchContext } from './src/lib/data';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        console.log('Fetching context...');
        const data = await fetchContext();
        console.log('--- RAW FORMATTED STRING FOR LLM ---');
        console.log(data.formattedString);
    } catch (err) {
        console.error(err);
    }
}

run();
