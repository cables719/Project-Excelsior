
import { DataContext } from './types';

// Simple in-memory cache
// NOTE: In a serverless environment (Vercel/Cloud Run), this persists only for the lifetime of the warm instance.
// This is acceptable: it reduces API calls significantly during a session, even if not perfect across all instances.

interface CacheEntry {
    data: DataContext;
    timestamp: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 Minutes

export const DataCache = {
    get: (): DataContext | null => {
        if (!cache) return null;
        if (Date.now() - cache.timestamp > CACHE_TTL_MS) {
            cache = null;
            return null;
        }
        return cache.data;
    },

    set: (data: DataContext) => {
        cache = {
            data,
            timestamp: Date.now()
        };
    },

    clear: () => {
        cache = null;
    }
};
