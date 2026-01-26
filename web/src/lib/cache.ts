
import { DataContext } from './types';

interface CacheEntry {
    data: DataContext;
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 Minutes

export const DataCache = {
    get: (key: string): DataContext | null => {
        const entry = cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            cache.delete(key);
            return null;
        }
        return entry.data;
    },

    set: (key: string, data: DataContext) => {
        cache.set(key, {
            data,
            timestamp: Date.now()
        });
    },

    clear: (key: string) => {
        cache.delete(key);
    },

    clearAll: () => {
        cache.clear();
    }
};
