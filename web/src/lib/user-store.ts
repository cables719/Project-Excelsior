
import fs from 'fs/promises';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'src', 'lib', 'users.json');

export interface UserConfig {
    sheetId: string;
}

export interface UserStore {
    [email: string]: UserConfig;
}

async function ensureStore() {
    try {
        await fs.access(STORE_PATH);
    } catch {
        // Create if not exists
        await fs.writeFile(STORE_PATH, JSON.stringify({}), 'utf-8');
    }
}

export async function getUserConfig(email: string): Promise<UserConfig | null> {
    await ensureStore();
    const data = await fs.readFile(STORE_PATH, 'utf-8');
    const store: UserStore = JSON.parse(data);
    return store[email] || null;
}

export async function saveUserConfig(email: string, config: UserConfig): Promise<void> {
    await ensureStore();
    const data = await fs.readFile(STORE_PATH, 'utf-8');
    const store: UserStore = JSON.parse(data);
    store[email] = config;
    await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}
