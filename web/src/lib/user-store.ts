
import fs from 'fs/promises';
import path from 'path';
import { cookies } from 'next/headers';

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
        // Create if not exists - This might fail in read-only envs like Cloud Run
        // so we catch and ignore, falling back to Env Vars
        try {
            await fs.writeFile(STORE_PATH, JSON.stringify({}), 'utf-8');
        } catch (e) {
            console.warn('Could not create local user store (read-only fs?). Using Env vars only.');
        }
    }
}

// Helper to generate user-specific cookie name to prevent data mismatch on shared devices
export function getCookieName(email: string) {
    // Sanitize email to be cookie-safe (alphanumeric + underscore)
    const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    return `fitsync_sheet_${safeEmail}`;
}

export async function getUserConfig(email: string): Promise<UserConfig | null> {
    // 1. Priority: Cookie (User Session) - Scoped to this specific user!
    try {
        const cookieStore = await cookies();
        const cookieName = getCookieName(email);
        const sheetId = cookieStore.get(cookieName)?.value;

        // We log what we found to help debugging Cloud Run issues
        // console.log(`[UserStore] Looking for cookie ${cookieName}:`, sheetId ? 'FOUND' : 'MISSING');

        if (sheetId) {
            return { sheetId };
        }
    } catch (e) {
        // Ignore errors (e.g. outside request context)
    }

    // 2. Fallback: Local Filesystem (Dev Mode - or remove if not needed)
    try {
        await ensureStore();
        const data = await fs.readFile(STORE_PATH, 'utf-8');
        const store: UserStore = JSON.parse(data);
        return store[email] || null;
    } catch (e) {
        return null;
    }
}

export async function saveUserConfig(email: string, config: UserConfig): Promise<void> {
    // If we have an Env Var, we treat it as immutable/primary, so we don't overwrite logic
    // But if the user is going through onboarding, they might be trying to set it.
    // In Cloud Run (Production), we cannot write to disk.

    try {
        await ensureStore();
        const data = await fs.readFile(STORE_PATH, 'utf-8');
        const store: UserStore = JSON.parse(data);
        store[email] = config;
        await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
    } catch (e) {
        console.warn('Failed to save user config to disk (likely read-only FS). Ensure GOOGLE_SHEET_ID is set in Env Vars.');
        // We don't throw here to avoid crashing the request, but the data won't persist across restarts unless Env Var is set.
    }
}
