# Offline Mode & Error Handling — Mobile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'app mobile de fonctionner hors-ligne (lecture + toggle de quêtes) avec sync automatique au retour du réseau et toast discret.

**Architecture:** AsyncStorage pour le cache de données (par Dofus, TTL 24h sur la liste), une queue persistée pour les toggles hors-ligne, NetInfo pour détecter la connectivité et déclencher le flush. Toast via React Context monté dans `(tabs)/_layout.tsx`.

**Tech Stack:** `@react-native-community/netinfo`, `@react-native-async-storage/async-storage` (déjà installé), React Context, Supabase

---

## File Map

### Créés
- `apps/mobile/lib/cache.ts` — helpers read/write AsyncStorage typés (avec TTL)
- `apps/mobile/lib/offlineQueue.ts` — ToggleAction type, addToQueue, flushQueue
- `apps/mobile/lib/useNetworkStatus.ts` — hook NetInfo, expose `isOnline`, déclenche flush
- `apps/mobile/lib/ToastContext.tsx` — Context + Provider + `useToast()` hook
- `apps/mobile/components/shared/Toast.tsx` — composant toast UI
- `apps/mobile/lib/__tests__/cache.test.ts` — tests cache helpers
- `apps/mobile/lib/__tests__/offlineQueue.test.ts` — tests queue logic

### Modifiés
- `apps/mobile/app/(tabs)/_layout.tsx` — ToastProvider + Toast + useNetworkStatus
- `apps/mobile/app/(tabs)/index.tsx` — try/catch loadData + cache fallback + pre-cache background
- `apps/mobile/app/(tabs)/resources.tsx` — try/catch loadData + cache fallback
- `apps/mobile/app/dofus/[slug].tsx` — try/catch loadData + cache fallback + offline toggle wrapper

---

## Task 1 — Installer @react-native-community/netinfo

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Installer la dépendance**

```bash
pnpm add @react-native-community/netinfo --filter @dofus-tracker/mobile
```

Expected: `@react-native-community/netinfo` apparaît dans `apps/mobile/package.json` dependencies.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml
git commit -m "chore(mobile): add @react-native-community/netinfo"
```

---

## Task 2 — cache.ts

**Files:**
- Create: `apps/mobile/lib/cache.ts`
- Create: `apps/mobile/lib/__tests__/cache.test.ts`

Les données sont stockées sous la forme `{ data: T, cachedAt: number }`. Le TTL est vérifié à la lecture.

- [ ] **Step 1: Créer `apps/mobile/lib/cache.ts`**

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEYS = {
  dofusList: "cache:dofus:list",
  dofusBySlug: (slug: string) => `cache:dofus:detail:${slug}`,
  dofusQuests: (slug: string) => `cache:dofus:quests:${slug}`,
  dofusProgress: (characterId: string) => `cache:dofus:progress:${characterId}`,
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
```

- [ ] **Step 2: Configurer vitest pour le package mobile**

Vérifier si un `vitest.config.ts` existe déjà dans `apps/mobile` :

```bash
ls apps/mobile/vitest.config.ts 2>/dev/null || echo "absent"
```

S'il est absent, créer `apps/mobile/vitest.config.ts` :

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
});
```

Et ajouter le script test dans `apps/mobile/package.json` dans la section `"scripts"` :

```json
"test": "vitest run"
```

Et ajouter vitest en devDependency :

```bash
pnpm add -D vitest --filter @dofus-tracker/mobile
```

- [ ] **Step 3: Écrire le test**

Créer `apps/mobile/lib/__tests__/cache.test.ts` :

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage
const store: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete store[key]; }),
  },
}));

import { readCache, writeCache } from "../cache";

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

describe("cache", () => {
  it("returns null when key absent", async () => {
    expect(await readCache("missing")).toBeNull();
  });

  it("writes and reads back data", async () => {
    await writeCache("key", { foo: "bar" });
    expect(await readCache("key")).toEqual({ foo: "bar" });
  });

  it("returns null when TTL expired", async () => {
    await writeCache("key", "value");
    // Backdating cachedAt by overwriting
    const raw = store["key"];
    const entry = JSON.parse(raw);
    entry.cachedAt = Date.now() - 1000 * 60 * 60 * 25; // 25h ago
    store["key"] = JSON.stringify(entry);

    expect(await readCache("key", 1000 * 60 * 60 * 24)).toBeNull();
  });

  it("returns data within TTL", async () => {
    await writeCache("key", "value");
    expect(await readCache("key", 1000 * 60 * 60 * 24)).toBe("value");
  });
});
```

- [ ] **Step 4: Lancer le test — doit passer**

```bash
pnpm --filter @dofus-tracker/mobile test
```

Expected: 4 tests passent.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/cache.ts apps/mobile/lib/__tests__/cache.test.ts apps/mobile/vitest.config.ts apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(mobile): add typed AsyncStorage cache helpers"
```

---

## Task 3 — offlineQueue.ts

**Files:**
- Create: `apps/mobile/lib/offlineQueue.ts`
- Create: `apps/mobile/lib/__tests__/offlineQueue.test.ts`

- [ ] **Step 1: Créer `apps/mobile/lib/offlineQueue.ts`**

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toggleQuestCompletion } from "@dofus-tracker/db";
import type { SupabaseClient } from "@supabase/supabase-js";

const QUEUE_KEY = "offline:queue";

export interface ToggleAction {
  questId: string;
  characterId: string;
  dofusId: string;
  completed: boolean;
  timestamp: number;
}

export async function getQueue(): Promise<ToggleAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: ToggleAction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Non-fatal
  }
}

export async function addToQueue(action: Omit<ToggleAction, "timestamp">): Promise<void> {
  const queue = await getQueue();
  // Dédupe : si même questId existe déjà, remplacer (last-write-wins)
  const filtered = queue.filter((a) => a.questId !== action.questId);
  filtered.push({ ...action, timestamp: Date.now() });
  await saveQueue(filtered);
}

export async function flushQueue(
  supabase: SupabaseClient,
  onFlushed: (count: number) => void
): Promise<void> {
  const queue = await getQueue();
  if (queue.length === 0) return;

  let flushed = 0;
  const remaining: ToggleAction[] = [];

  for (const action of queue) {
    try {
      await toggleQuestCompletion(supabase, action.characterId, action.questId, action.completed);
      flushed++;
    } catch (err: unknown) {
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error && err.message.toLowerCase().includes("network"));
      if (isNetworkError) {
        // Pas de réseau — stopper, garder le reste en queue
        remaining.push(...queue.slice(queue.indexOf(action)));
        break;
      }
      // Autre erreur (ex: RLS) — supprimer de la queue pour éviter boucle infinie
    }
  }

  await saveQueue(remaining);
  if (flushed > 0) onFlushed(flushed);
}
```

- [ ] **Step 2: Écrire le test**

Créer `apps/mobile/lib/__tests__/offlineQueue.test.ts` :

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

const store: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete store[key]; }),
  },
}));

const mockToggle = vi.fn();
vi.mock("@dofus-tracker/db", () => ({
  toggleQuestCompletion: (...args: unknown[]) => mockToggle(...args),
}));

import { addToQueue, getQueue, flushQueue } from "../offlineQueue";

const fakeSupabase = {} as never;

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  mockToggle.mockReset();
});

describe("offlineQueue", () => {
  it("queue is empty by default", async () => {
    expect(await getQueue()).toEqual([]);
  });

  it("addToQueue adds an action", async () => {
    await addToQueue({ questId: "q1", characterId: "c1", dofusId: "d1", completed: true });
    const q = await getQueue();
    expect(q).toHaveLength(1);
    expect(q[0].questId).toBe("q1");
    expect(q[0].completed).toBe(true);
  });

  it("addToQueue deduplicates by questId (last-write-wins)", async () => {
    await addToQueue({ questId: "q1", characterId: "c1", dofusId: "d1", completed: true });
    await addToQueue({ questId: "q1", characterId: "c1", dofusId: "d1", completed: false });
    const q = await getQueue();
    expect(q).toHaveLength(1);
    expect(q[0].completed).toBe(false);
  });

  it("flushQueue calls toggleQuestCompletion and clears queue on success", async () => {
    mockToggle.mockResolvedValue(undefined);
    await addToQueue({ questId: "q1", characterId: "c1", dofusId: "d1", completed: true });

    const onFlushed = vi.fn();
    await flushQueue(fakeSupabase, onFlushed);

    expect(mockToggle).toHaveBeenCalledWith(fakeSupabase, "c1", "q1", true);
    expect(onFlushed).toHaveBeenCalledWith(1);
    expect(await getQueue()).toHaveLength(0);
  });

  it("flushQueue stops and keeps remaining on network error", async () => {
    mockToggle.mockRejectedValue(new TypeError("Network request failed"));
    await addToQueue({ questId: "q1", characterId: "c1", dofusId: "d1", completed: true });

    const onFlushed = vi.fn();
    await flushQueue(fakeSupabase, onFlushed);

    expect(onFlushed).not.toHaveBeenCalled();
    expect(await getQueue()).toHaveLength(1);
  });

  it("flushQueue drops action on non-network error", async () => {
    mockToggle.mockRejectedValue(new Error("RLS policy violation"));
    await addToQueue({ questId: "q1", characterId: "c1", dofusId: "d1", completed: true });

    const onFlushed = vi.fn();
    await flushQueue(fakeSupabase, onFlushed);

    expect(await getQueue()).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Lancer les tests — doivent passer**

```bash
pnpm --filter @dofus-tracker/mobile test
```

Expected: 9 tests passent (4 cache + 5 queue).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/lib/offlineQueue.ts apps/mobile/lib/__tests__/offlineQueue.test.ts
git commit -m "feat(mobile): add offline toggle queue with flush logic"
```

---

## Task 4 — ToastContext + Toast component

**Files:**
- Create: `apps/mobile/lib/ToastContext.tsx`
- Create: `apps/mobile/components/shared/Toast.tsx`

- [ ] **Step 1: Créer `apps/mobile/lib/ToastContext.tsx`**

```tsx
import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ToastContextValue {
  message: string | null;
  show: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  message: null,
  show: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    timerRef.current = setTimeout(() => setMessage(null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ message, show }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
```

- [ ] **Step 2: Créer `apps/mobile/components/shared/Toast.tsx`**

```tsx
import { Animated, Text, useAnimatedValue } from "react-native";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "@/lib/ToastContext";

export function Toast() {
  const { message } = useToast();
  const { bottom } = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: message ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [message, opacity]);

  if (!message) return null;

  return (
    <Animated.View
      style={{
        opacity,
        position: "absolute",
        bottom: bottom + 80, // au-dessus de la tab bar
        left: 16,
        right: 16,
        backgroundColor: "rgba(15,30,18,0.95)",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.2)",
        zIndex: 999,
      }}
    >
      <Text style={{ color: "#4ade80", fontSize: 13, textAlign: "center" }}>
        {message}
      </Text>
    </Animated.View>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @dofus-tracker/mobile typecheck
```

Expected: 0 erreurs.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/lib/ToastContext.tsx apps/mobile/components/shared/Toast.tsx
git commit -m "feat(mobile): add ToastContext and Toast component"
```

---

## Task 5 — useNetworkStatus + wire dans _layout.tsx

**Files:**
- Create: `apps/mobile/lib/useNetworkStatus.ts`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Créer `apps/mobile/lib/useNetworkStatus.ts`**

```ts
import { useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { flushQueue } from "./offlineQueue";
import { supabase } from "./supabase";
import { useToast } from "./ToastContext";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const wasOffline = useRef(false);
  const { show } = useToast();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(online);

      if (!online) {
        wasOffline.current = true;
      } else if (wasOffline.current) {
        wasOffline.current = false;
        flushQueue(supabase, (count) => {
          show(`Connexion rétablie · ${count} action${count > 1 ? "s" : ""} synchronisée${count > 1 ? "s" : ""}`);
        });
      }
    });

    return unsubscribe;
  }, [show]);

  return { isOnline };
}
```

- [ ] **Step 2: Modifier `apps/mobile/app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { ToastProvider } from "@/lib/ToastContext";
import { Toast } from "@/components/shared/Toast";
import { useNetworkStatus } from "@/lib/useNetworkStatus";

function TabsWithToast() {
  useNetworkStatus();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: "#0d1f12",
            borderTopColor: "rgba(255,255,255,0.06)",
          },
          tabBarActiveTintColor: "#4ade80",
          tabBarInactiveTintColor: "#6b7280",
          headerStyle: { backgroundColor: "#080e0a" },
          headerTintColor: "#fff",
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Mes Dofus",
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🥚</Text>,
          }}
        />
        <Tabs.Screen
          name="resources"
          options={{
            title: "Ressources",
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📦</Text>,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
          }}
        />
      </Tabs>
      <Toast />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <ToastProvider>
      <TabsWithToast />
    </ToastProvider>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @dofus-tracker/mobile typecheck
```

Expected: 0 erreurs.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/lib/useNetworkStatus.ts "apps/mobile/app/(tabs)/_layout.tsx"
git commit -m "feat(mobile): add useNetworkStatus, wire ToastProvider and Toast in tabs layout"
```

---

## Task 6 — Cache + fallback dans index.tsx (Mes Dofus)

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

Le pre-cache silencieux lance `getQuestsForDofus` pour chaque Dofus en background après le chargement de la grille. Il utilise `activeCharacterId` pour cacher la progression correcte.

- [ ] **Step 1: Réécrire `apps/mobile/app/(tabs)/index.tsx`**

```tsx
import { useState, useCallback } from "react";
import { View, Text } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { getDofusList, getDofusProgressForCharacter, getCharacters, getQuestsForDofus } from "@dofus-tracker/db";
import { DofusGrid } from "@/components/home/DofusGrid";
import { CharacterSelector } from "@/components/shared/CharacterSelector";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";
import { useToast } from "@/lib/ToastContext";
import type { Dofus, DofusProgress, Character } from "@dofus-tracker/types";

const TTL_24H = 1000 * 60 * 60 * 24;

export default function MesDofusScreen() {
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const [dofusList, setDofusList] = useState<Dofus[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, DofusProgress>>(new Map());
  const [characters, setCharacters] = useState<Character[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { show } = useToast();

  const preCacheQuests = useCallback(async (dofus: Dofus[], characterId: string) => {
    for (const d of dofus) {
      const cached = await readCache(CACHE_KEYS.dofusQuests(d.slug));
      if (!cached) {
        try {
          const quests = await getQuestsForDofus(supabase, d.id, characterId);
          await writeCache(CACHE_KEYS.dofusQuests(d.slug), quests);
        } catch {
          // Silencieux — best effort
        }
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRefreshing(false); return; }

    try {
      const [allDofus, allChars] = await Promise.all([
        getDofusList(supabase),
        getCharacters(supabase, user.id),
      ]);
      setDofusList(allDofus);
      setCharacters(allChars);
      await writeCache(CACHE_KEYS.dofusList, allDofus);

      if (activeCharacterId) {
        const progress = await getDofusProgressForCharacter(supabase, activeCharacterId);
        const map = new Map(progress.map((p) => [p.dofus_id, p]));
        setProgressMap(map);
        await writeCache(CACHE_KEYS.dofusProgress(activeCharacterId), progress);
        // Pre-cache en background — ne pas await
        preCacheQuests(allDofus, activeCharacterId);
      }
    } catch {
      // Fallback cache
      const cachedDofus = await readCache<Dofus[]>(CACHE_KEYS.dofusList, TTL_24H);
      if (cachedDofus) {
        setDofusList(cachedDofus);
        show("Mode hors-ligne — données locales");
      }
      if (activeCharacterId) {
        const cachedProgress = await readCache<DofusProgress[]>(CACHE_KEYS.dofusProgress(activeCharacterId));
        if (cachedProgress) {
          setProgressMap(new Map(cachedProgress.map((p) => [p.dofus_id, p])));
        }
      }
      if (!await readCache<Dofus[]>(CACHE_KEYS.dofusList, TTL_24H)) {
        show("Erreur de chargement");
      }
    }
    setRefreshing(false);
  }, [activeCharacterId, show, preCacheQuests]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  return (
    <View className="flex-1 bg-dofus-dark">
      <Stack.Screen
        options={{
          title: "Mes Dofus",
          headerRight: () => <CharacterSelector characters={characters} />,
        }}
      />
      {dofusList.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Chargement…</Text>
        </View>
      ) : (
        <DofusGrid
          dofusList={dofusList.filter(
            (d) => progressMap.size === 0 || (progressMap.get(d.id)?.total_quests ?? 0) > 0
          )}
          progressMap={progressMap}
          refreshing={refreshing}
          onRefresh={loadData}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @dofus-tracker/mobile typecheck
```

Expected: 0 erreurs.

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile/app/(tabs)/index.tsx"
git commit -m "feat(mobile): add cache fallback and background pre-cache to Mes Dofus screen"
```

---

## Task 7 — Cache + offline toggle dans [slug].tsx

**Files:**
- Modify: `apps/mobile/app/dofus/[slug].tsx`

Le wrapper `offlineHandleToggle` intercepte l'erreur réseau avant que `useQuestToggle` ne fasse son rollback. Si hors-ligne, l'état optimiste est conservé et l'action est mise en queue.

- [ ] **Step 1: Réécrire `apps/mobile/app/dofus/[slug].tsx`**

```tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import type { BottomSheetHandle } from "@/components/shared/CustomBottomSheet";
import {
  getDofusList,
  getDofusBySlug,
  getQuestsForDofus,
  toggleQuestCompletion,
} from "@dofus-tracker/db";
import { useQuestToggle } from "@dofus-tracker/ui";
import { DofusHeader } from "@/components/dofus/DofusHeader";
import { QuestSection } from "@/components/dofus/QuestSection";
import { ResourceSection } from "@/components/dofus/ResourceSection";
import { ResourceBottomSheet } from "@/components/resources/ResourceBottomSheet";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";
import { addToQueue } from "@/lib/offlineQueue";
import { useToast } from "@/lib/ToastContext";
import type {
  Dofus,
  QuestWithChain,
  AggregatedResource,
  QuestSection as QuestSectionType,
} from "@dofus-tracker/types";

function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError ||
    (err instanceof Error && err.message.toLowerCase().includes("network"))
  );
}

export default function DofusDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const bottomSheetRef = useRef<BottomSheetHandle>(null);
  const { top } = useSafeAreaInsets();
  const { show } = useToast();

  const [dofus, setDofus] = useState<Dofus | null>(null);
  const [allDofus, setAllDofus] = useState<Dofus[]>([]);
  const [quests, setQuests] = useState<QuestWithChain[]>([]);
  const [loading, setLoading] = useState(true);

  const { handleBulkComplete } = useQuestToggle({
    supabase,
    characterId: activeCharacterId,
    dofusId: dofus?.id ?? "",
    setQuests,
  });

  // Wrapper qui intercepte les erreurs réseau avant le rollback de useQuestToggle
  const offlineHandleToggle = useCallback(
    async (questId: string, completed: boolean) => {
      if (!activeCharacterId || !dofus) return;
      // Optimistic update
      setQuests((prev) =>
        prev.map((q) => (q.id === questId ? { ...q, is_completed: completed } : q))
      );
      try {
        await toggleQuestCompletion(supabase, activeCharacterId, questId, completed);
        // Mettre à jour le cache des quêtes
        setQuests((current) => {
          writeCache(CACHE_KEYS.dofusQuests(slug ?? ""), current);
          return current;
        });
      } catch (err) {
        if (isNetworkError(err)) {
          // Garder l'état optimiste + mettre en queue
          await addToQueue({
            questId,
            characterId: activeCharacterId,
            dofusId: dofus.id,
            completed,
          });
          show("Mode hors-ligne — action mise en attente");
        } else {
          // Rollback pour les erreurs non-réseau
          setQuests((prev) =>
            prev.map((q) => (q.id === questId ? { ...q, is_completed: !completed } : q))
          );
        }
      }
    },
    [activeCharacterId, dofus, slug, show]
  );

  const loadData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const [foundDofus, allD] = await Promise.all([
        getDofusBySlug(supabase, slug),
        getDofusList(supabase),
      ]);
      setDofus(foundDofus);
      setAllDofus(allD);
      if (foundDofus) await writeCache(CACHE_KEYS.dofusBySlug(slug), foundDofus);

      if (foundDofus && activeCharacterId) {
        const q = await getQuestsForDofus(supabase, foundDofus.id, activeCharacterId);
        setQuests(q);
        await writeCache(CACHE_KEYS.dofusQuests(slug), q);
      }
    } catch {
      // Fallback cache
      const [cachedDofus, cachedQuests] = await Promise.all([
        readCache<Dofus>(CACHE_KEYS.dofusBySlug(slug)),
        readCache<QuestWithChain[]>(CACHE_KEYS.dofusQuests(slug)),
      ]);
      if (cachedDofus) setDofus(cachedDofus);
      if (cachedQuests) setQuests(cachedQuests);
      if (cachedDofus || cachedQuests) {
        show("Mode hors-ligne — données locales");
      } else {
        show("Erreur de chargement");
      }
    }
    setLoading(false);
  }, [slug, activeCharacterId, show]);

  useEffect(() => { loadData(); }, [loadData]);

  const prerequisites = quests.filter((q) => q.chain.section === "prerequisite");
  const mainQuests = quests.filter((q) => q.chain.section === "main");
  const completedCount = quests.filter((q) => q.is_completed).length;

  const aggregatedResources: AggregatedResource[] = Object.values(
    quests.reduce(
      (acc, quest) => {
        for (const r of quest.resources) {
          const existing = acc[r.name];
          acc[r.name] = {
            name: r.name,
            quantity: (existing?.quantity ?? 0) + r.quantity,
            is_kamas: r.is_kamas,
          };
        }
        return acc;
      },
      {} as Record<string, AggregatedResource>
    )
  );

  const mainQuestGroups: Array<{ title: string; quests: typeof mainQuests }> = [];
  for (const quest of mainQuests) {
    const title = quest.chain.sub_section ?? "Les quêtes";
    const existing = mainQuestGroups.find((g) => g.title === title);
    if (existing) existing.quests.push(quest);
    else mainQuestGroups.push({ title, quests: [quest] });
  }

  if (loading || !dofus) {
    return (
      <View className="flex-1 bg-dofus-dark items-center justify-center">
        <ActivityIndicator color="#4ade80" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-dofus-dark">
      <Stack.Screen options={{ title: dofus.name, headerBackTitle: "Mes Dofus" }} />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingTop: top + 16 }}>
        <DofusHeader
          dofus={dofus}
          allDofus={allDofus}
          quests={quests}
          completedCount={completedCount}
        />
        {prerequisites.length > 0 && (
          <QuestSection
            title="Prérequis"
            quests={prerequisites}
            dofusColor={dofus.color}
            onToggle={offlineHandleToggle}
            onBulkComplete={() => handleBulkComplete("prerequisite" as QuestSectionType)}
          />
        )}
        {mainQuestGroups.map(({ title, quests: groupQuests }) => (
          <QuestSection
            key={title}
            title={title}
            quests={groupQuests}
            dofusColor={dofus.color}
            onToggle={offlineHandleToggle}
            onBulkComplete={() => handleBulkComplete("main" as QuestSectionType)}
          />
        ))}
        {aggregatedResources.length > 0 && (
          <ResourceSection
            resources={aggregatedResources}
            onOpenSheet={() => bottomSheetRef.current?.expand()}
          />
        )}
      </ScrollView>

      <ResourceBottomSheet
        ref={bottomSheetRef}
        resources={aggregatedResources}
        dofusColor={dofus.color}
      />
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @dofus-tracker/mobile typecheck
```

Expected: 0 erreurs.

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile/app/dofus/[slug].tsx"
git commit -m "feat(mobile): add cache fallback and offline toggle queue to Dofus detail screen"
```

---

## Task 8 — Cache + fallback dans resources.tsx

**Files:**
- Modify: `apps/mobile/app/(tabs)/resources.tsx`

- [ ] **Step 1: Réécrire `apps/mobile/app/(tabs)/resources.tsx`**

```tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { Stack } from "expo-router";
import { BlurView } from "expo-blur";
import type { BottomSheetHandle } from "@/components/shared/CustomBottomSheet";
import { getDofusList, getAggregatedResourcesForDofus } from "@dofus-tracker/db";
import { ResourceBottomSheet } from "@/components/resources/ResourceBottomSheet";
import { supabase } from "@/lib/supabase";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";
import { useToast } from "@/lib/ToastContext";
import type { Dofus, AggregatedResource } from "@dofus-tracker/types";

const RESOURCES_CACHE_KEY = "cache:resources:all";

interface DofusResources {
  dofus: Dofus;
  resources: AggregatedResource[];
}

export default function ResourcesScreen() {
  const [data, setData] = useState<DofusResources[]>([]);
  const [selected, setSelected] = useState<DofusResources | null>(null);
  const bottomSheetRef = useRef<BottomSheetHandle>(null);
  const { show } = useToast();

  const loadData = useCallback(async () => {
    try {
      const allDofus = await getDofusList(supabase);
      const results = await Promise.all(
        allDofus.map(async (dofus) => ({
          dofus,
          resources: await getAggregatedResourcesForDofus(supabase, dofus.id),
        }))
      );
      const filtered = results.filter((r) => r.resources.length > 0);
      setData(filtered);
      await writeCache(RESOURCES_CACHE_KEY, filtered);
    } catch {
      const cached = await readCache<DofusResources[]>(RESOURCES_CACHE_KEY);
      if (cached) {
        setData(cached);
        show("Mode hors-ligne — données locales");
      } else {
        show("Erreur de chargement");
      }
    }
  }, [show]);

  useEffect(() => { loadData(); }, [loadData]);

  function openSheet(item: DofusResources) {
    setSelected(item);
    bottomSheetRef.current?.expand();
  }

  return (
    <View className="flex-1 bg-dofus-dark">
      <Stack.Screen options={{ title: "Ressources" }} />
      <FlatList
        data={data}
        keyExtractor={(item) => item.dofus.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openSheet(item)} className="mb-3" activeOpacity={0.8}>
            <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden">
              <View
                className="flex-row items-center justify-between px-4 py-3"
                style={{ backgroundColor: "rgba(8,16,10,0.55)" }}
              >
                <View>
                  <Text className="text-white font-semibold">{item.dofus.name}</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">
                    {item.resources.filter((r) => !r.is_kamas).length} ressources
                  </Text>
                </View>
                <Text className="text-gray-500 text-lg">›</Text>
              </View>
            </BlurView>
          </TouchableOpacity>
        )}
      />

      {selected && (
        <ResourceBottomSheet
          ref={bottomSheetRef}
          resources={selected.resources}
          dofusColor={selected.dofus.color}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 2: Typecheck global**

```bash
pnpm --filter @dofus-tracker/mobile typecheck
pnpm --filter @dofus-tracker/ui typecheck
pnpm --filter @dofus-tracker/web typecheck
```

Expected: 0 erreurs pour chaque package.

- [ ] **Step 3: Lancer tous les tests**

```bash
pnpm --filter @dofus-tracker/mobile test
pnpm --filter @dofus-tracker/ui test
pnpm --filter @dofus-tracker/sync test
```

Expected: tous les tests passent.

- [ ] **Step 4: Commit final**

```bash
git add "apps/mobile/app/(tabs)/resources.tsx"
git commit -m "feat(mobile): add cache fallback to Resources screen"
```
