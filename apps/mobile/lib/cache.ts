import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEYS = {
  dofusList: "cache:dofus:list",
  dofusBySlug: (slug: string) => `cache:dofus:detail:${slug}`,
  dofusQuests: (slug: string) => `cache:dofus:quests:${slug}`,
  dofusProgress: (characterId: string) => `cache:dofus:progress:${characterId}`,
  achievementSubcategories: (characterId: string) => `cache:achievements:subcategories:${characterId}`,
  achievements: (subcategoryId: number, characterId: string) => `cache:achievements:${subcategoryId}:${characterId}`,
} as const;

export { CACHE_KEYS };

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

export async function readCache<T>(key: string, ttlMs?: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (ttlMs !== undefined && Date.now() - entry.cachedAt > ttlMs) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, cachedAt: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage failure is non-fatal
  }
}
