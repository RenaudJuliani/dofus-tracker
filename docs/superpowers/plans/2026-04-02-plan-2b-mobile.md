# Plan 2b — App Mobile Expo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer l'app mobile Expo (Android first) avec navigation tab bar, auth Supabase OAuth, grille Dofus, page détail, et resources tab — en extrayant la logique partagée dans un nouveau `packages/ui`.

**Architecture:** `packages/ui` contient la logique partagée (store Zustand, hooks métier, constantes) sans aucun JSX. `apps/web` est migré pour consommer `@dofus-tracker/ui`. `apps/mobile` est scaffoldé avec Expo Router v3 + NativeWind v4, consomme `@dofus-tracker/ui`, `@dofus-tracker/db`, et `@dofus-tracker/types`.

**Tech Stack:** Expo SDK 51, Expo Router v3, NativeWind v4, Zustand, react-native-reanimated, expo-blur, expo-auth-session, @gorhom/bottom-sheet, @react-native-async-storage/async-storage, EAS Build, Vitest (packages/ui uniquement).

---

## File Map

### Créés

| Fichier | Responsabilité |
|---|---|
| `packages/ui/package.json` | Package @dofus-tracker/ui, dépendances zustand + react |
| `packages/ui/tsconfig.json` | TS config package |
| `packages/ui/vitest.config.ts` | Vitest avec jsdom (hooks React) |
| `packages/ui/src/stores/characterStore.ts` | Factory `createCharacterStore(storage)` |
| `packages/ui/src/hooks/useQuestToggle.ts` | Hook toggle optimistic + bulk complete |
| `packages/ui/src/hooks/useResources.ts` | Hook multiplier ressources |
| `packages/ui/src/constants/dofusColors.ts` | QUEST_TYPE_BADGE_CONFIG, DOFUS_CLASSES |
| `packages/ui/src/index.ts` | Barrel exports |
| `packages/ui/__tests__/characterStore.test.ts` | Tests store |
| `packages/ui/__tests__/useQuestToggle.test.ts` | Tests hook toggle |
| `packages/ui/__tests__/useResources.test.ts` | Tests hook resources |
| `apps/mobile/package.json` | App Expo, dépendances |
| `apps/mobile/tsconfig.json` | TS config app |
| `apps/mobile/app.json` | Expo config (slug, scheme, android package) |
| `apps/mobile/eas.json` | Profils EAS (development, preview, production) |
| `apps/mobile/babel.config.js` | Babel pour Expo + NativeWind |
| `apps/mobile/metro.config.js` | Metro pour NativeWind |
| `apps/mobile/tailwind.config.js` | Tailwind config NativeWind |
| `apps/mobile/global.css` | Import Tailwind base |
| `apps/mobile/.env.example` | Variables d'environnement |
| `apps/mobile/lib/supabase.ts` | Client Supabase avec AsyncStorage |
| `apps/mobile/lib/stores/characterStore.ts` | Instance mobile avec AsyncStorage |
| `apps/mobile/app/_layout.tsx` | Root layout + auth gate |
| `apps/mobile/app/(auth)/_layout.tsx` | Layout auth (Stack) |
| `apps/mobile/app/(auth)/login.tsx` | Écran login |
| `apps/mobile/app/(auth)/register.tsx` | Écran register |
| `apps/mobile/app/(tabs)/_layout.tsx` | Tab bar (3 onglets) |
| `apps/mobile/app/(tabs)/index.tsx` | Tab "Mes Dofus" |
| `apps/mobile/app/(tabs)/resources.tsx` | Tab "Ressources" |
| `apps/mobile/app/(tabs)/profile.tsx` | Tab "Profil" |
| `apps/mobile/app/dofus/[slug].tsx` | Page détail Dofus |
| `apps/mobile/components/shared/EggImage.tsx` | Image œuf + animation flottement |
| `apps/mobile/components/shared/ProgressBar.tsx` | Barre progression shimmer |
| `apps/mobile/components/shared/QuestTypeBadge.tsx` | Badge coloré par type |
| `apps/mobile/components/shared/QuestGroupBox.tsx` | Encadré orange "faire ensemble" |
| `apps/mobile/components/shared/CharacterSelector.tsx` | Dropdown sélecteur personnage |
| `apps/mobile/components/home/DofusCard.tsx` | Card grille (egg + progress) |
| `apps/mobile/components/home/DofusGrid.tsx` | FlatList 2 colonnes |
| `apps/mobile/components/dofus/DofusHeader.tsx` | Header détail (egg, stats, shared) |
| `apps/mobile/components/dofus/QuestSection.tsx` | Section quêtes (titre + liste) |
| `apps/mobile/components/dofus/QuestItem.tsx` | Item quête (checkbox + badges) |
| `apps/mobile/components/dofus/ResourceSection.tsx` | Section ressources + bouton sheet |
| `apps/mobile/components/resources/ResourceBottomSheet.tsx` | Bottom sheet multiplicateur |

### Modifiés

| Fichier | Changement |
|---|---|
| `apps/web/lib/stores/characterStore.ts` | Remplacé par appel `createCharacterStore(localStorage)` depuis `@dofus-tracker/ui` |
| `apps/web/package.json` | Ajout `@dofus-tracker/ui: workspace:*` |
| `turbo.json` | Ajout tâche `lint` optionnelle, vérification pipeline |

---

## Task 1 — Scaffold packages/ui

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/vitest.config.ts`
- Create: `packages/ui/src/index.ts`

- [ ] **Step 1: Créer `packages/ui/package.json`**

```json
{
  "name": "@dofus-tracker/ui",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@dofus-tracker/db": "workspace:*",
    "@dofus-tracker/types": "workspace:*",
    "react": "^18.3.1",
    "zustand": "^4.5.4"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.3",
    "jsdom": "^24.1.1",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  },
  "peerDependencies": {
    "react": "^18.3.1"
  }
}
```

- [ ] **Step 2: Créer `packages/ui/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "module": "ESNext"
  },
  "include": ["src", "__tests__"]
}
```

- [ ] **Step 3: Créer `packages/ui/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

- [ ] **Step 4: Créer `packages/ui/src/index.ts` (barrel vide pour l'instant)**

```typescript
// Stores
export { createCharacterStore } from "./stores/characterStore.js";

// Hooks
export { useQuestToggle } from "./hooks/useQuestToggle.js";
export { useResources } from "./hooks/useResources.js";

// Constants
export {
  QUEST_TYPE_BADGE_CONFIG,
  DOFUS_CLASSES,
} from "./constants/dofusColors.js";
```

- [ ] **Step 5: Installer les dépendances**

```bash
pnpm install
```

Expected: pas d'erreur, `node_modules` mis à jour dans packages/ui.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/package.json packages/ui/tsconfig.json packages/ui/vitest.config.ts packages/ui/src/index.ts
git commit -m "feat(ui): scaffold packages/ui"
```

---

## Task 2 — characterStore dans packages/ui

**Files:**
- Create: `packages/ui/src/stores/characterStore.ts`
- Create: `packages/ui/__tests__/characterStore.test.ts`
- Modify: `apps/web/lib/stores/characterStore.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Écrire le test**

Créer `packages/ui/__tests__/characterStore.test.ts` :

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createCharacterStore } from "../src/stores/characterStore.js";
import { createJSONStorage } from "zustand/middleware";

function makeStore() {
  const mem: Record<string, string> = {};
  const storage = {
    getItem: (k: string) => mem[k] ?? null,
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
  };
  return createCharacterStore(createJSONStorage(() => storage));
}

describe("characterStore", () => {
  it("activeCharacterId is null by default", () => {
    const store = makeStore();
    expect(store.getState().activeCharacterId).toBeNull();
  });

  it("setActiveCharacterId updates the active id", () => {
    const store = makeStore();
    store.getState().setActiveCharacterId("abc-123");
    expect(store.getState().activeCharacterId).toBe("abc-123");
  });

  it("setActiveCharacterId accepts null to deselect", () => {
    const store = makeStore();
    store.getState().setActiveCharacterId("abc-123");
    store.getState().setActiveCharacterId(null);
    expect(store.getState().activeCharacterId).toBeNull();
  });
});
```

- [ ] **Step 2: Vérifier que le test échoue**

```bash
pnpm --filter @dofus-tracker/ui test
```

Expected: FAIL — "Cannot find module '../src/stores/characterStore.js'"

- [ ] **Step 3: Implémenter `packages/ui/src/stores/characterStore.ts`**

```typescript
import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";

interface CharacterStore {
  activeCharacterId: string | null;
  setActiveCharacterId: (id: string | null) => void;
}

export function createCharacterStore(storage: PersistStorage<CharacterStore>) {
  return create<CharacterStore>()(
    persist(
      (set) => ({
        activeCharacterId: null,
        setActiveCharacterId: (id) => set({ activeCharacterId: id }),
      }),
      { name: "dofus-tracker-character", storage }
    )
  );
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```bash
pnpm --filter @dofus-tracker/ui test
```

Expected: PASS — 3 tests passent.

- [ ] **Step 5: Migrer `apps/web/lib/stores/characterStore.ts`**

Remplacer le contenu du fichier par :

```typescript
import { createCharacterStore } from "@dofus-tracker/ui";
import { createJSONStorage } from "zustand/middleware";

export const useCharacterStore = createCharacterStore(
  createJSONStorage(() => localStorage)
);
```

- [ ] **Step 6: Ajouter `@dofus-tracker/ui` dans `apps/web/package.json`**

Dans la section `"dependencies"`, ajouter :
```json
"@dofus-tracker/ui": "workspace:*"
```

- [ ] **Step 7: Vérifier que le web compile**

```bash
pnpm --filter @dofus-tracker/web typecheck
```

Expected: pas d'erreur TypeScript.

- [ ] **Step 8: Commit**

```bash
git add packages/ui/src/stores/characterStore.ts packages/ui/__tests__/characterStore.test.ts apps/web/lib/stores/characterStore.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(ui): add createCharacterStore factory, migrate apps/web"
```

---

## Task 3 — Constants partagées

**Files:**
- Create: `packages/ui/src/constants/dofusColors.ts`

- [ ] **Step 1: Créer `packages/ui/src/constants/dofusColors.ts`**

```typescript
import type { QuestType } from "@dofus-tracker/types";

export const QUEST_TYPE_BADGE_CONFIG: Record<
  QuestType,
  { label: string; color: string }
> = {
  combat_solo: { label: "Combat solo", color: "#ef4444" },
  combat_groupe: { label: "Groupe", color: "#f97316" },
  donjon: { label: "Donjon", color: "#a855f7" },
  metier: { label: "Métier", color: "#eab308" },
  boss: { label: "Boss", color: "#dc2626" },
  succes: { label: "Succès", color: "#06b6d4" },
  horaires: { label: "Horaires", color: "#64748b" },
};

export const DOFUS_CLASSES = [
  "Cra", "Ecaflip", "Eniripsa", "Enutrof", "Feca",
  "Iop", "Masqueraider", "Osamodas", "Pandawa", "Roublard",
  "Sacrieur", "Sadida", "Sram", "Steamer", "Xelor", "Zobal",
  "Eliotrope", "Huppermage", "Ouginak", "Forgelance",
] as const;
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @dofus-tracker/ui typecheck
```

Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/constants/dofusColors.ts
git commit -m "feat(ui): add QUEST_TYPE_BADGE_CONFIG and DOFUS_CLASSES constants"
```

---

## Task 4 — Hook useQuestToggle

**Files:**
- Create: `packages/ui/src/hooks/useQuestToggle.ts`
- Create: `packages/ui/__tests__/useQuestToggle.test.ts`

- [ ] **Step 1: Écrire les tests**

Créer `packages/ui/__tests__/useQuestToggle.test.ts` :

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQuestToggle } from "../src/hooks/useQuestToggle.js";
import type { QuestWithChain } from "@dofus-tracker/types";

const mockToggleQuestCompletion = vi.fn().mockResolvedValue(undefined);
const mockBulkCompleteSection = vi.fn().mockResolvedValue(undefined);
const mockGetQuestsForDofus = vi.fn().mockResolvedValue([]);

vi.mock("@dofus-tracker/db", () => ({
  toggleQuestCompletion: (...args: unknown[]) => mockToggleQuestCompletion(...args),
  bulkCompleteSection: (...args: unknown[]) => mockBulkCompleteSection(...args),
  getQuestsForDofus: (...args: unknown[]) => mockGetQuestsForDofus(...args),
}));

const fakeSupabase = {} as never;

function makeQuest(id: string, section: "prerequisite" | "main", completed = false): QuestWithChain {
  return {
    id,
    name: `Quest ${id}`,
    slug: id,
    dofuspourlesnoobs_url: null,
    created_at: "",
    chain: {
      id: `chain-${id}`,
      dofus_id: "dofus-1",
      quest_id: id,
      section,
      order_index: 1,
      group_id: null,
      quest_types: [],
      combat_count: null,
      is_avoidable: false,
    },
    is_completed: completed,
    shared_dofus_ids: [],
  };
}

describe("useQuestToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggles a quest optimistically", async () => {
    const quests = [makeQuest("q1", "main", false)];
    const setQuests = vi.fn();

    const { result } = renderHook(() =>
      useQuestToggle({
        supabase: fakeSupabase,
        characterId: "char-1",
        dofusId: "dofus-1",
        setQuests,
      })
    );

    await act(async () => {
      await result.current.handleToggle("q1", true);
    });

    // Optimistic update called first
    expect(setQuests).toHaveBeenCalled();
    // Then DB call
    expect(mockToggleQuestCompletion).toHaveBeenCalledWith(
      fakeSupabase,
      "char-1",
      "q1",
      true
    );
  });

  it("does nothing when characterId is null", async () => {
    const setQuests = vi.fn();
    const { result } = renderHook(() =>
      useQuestToggle({
        supabase: fakeSupabase,
        characterId: null,
        dofusId: "dofus-1",
        setQuests,
      })
    );

    await act(async () => {
      await result.current.handleToggle("q1", true);
    });

    expect(setQuests).not.toHaveBeenCalled();
    expect(mockToggleQuestCompletion).not.toHaveBeenCalled();
  });

  it("rolls back on error", async () => {
    mockToggleQuestCompletion.mockRejectedValueOnce(new Error("network error"));
    const setQuests = vi.fn();

    const { result } = renderHook(() =>
      useQuestToggle({
        supabase: fakeSupabase,
        characterId: "char-1",
        dofusId: "dofus-1",
        setQuests,
      })
    );

    await act(async () => {
      await result.current.handleToggle("q1", true);
    });

    // Called twice: optimistic update + rollback
    expect(setQuests).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
pnpm --filter @dofus-tracker/ui test
```

Expected: FAIL — "Cannot find module '../src/hooks/useQuestToggle.js'"

- [ ] **Step 3: Implémenter `packages/ui/src/hooks/useQuestToggle.ts`**

```typescript
import { useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  toggleQuestCompletion,
  bulkCompleteSection,
  getQuestsForDofus,
} from "@dofus-tracker/db";
import type { QuestWithChain, QuestSection } from "@dofus-tracker/types";

interface Params {
  supabase: SupabaseClient;
  characterId: string | null;
  dofusId: string;
  setQuests: React.Dispatch<React.SetStateAction<QuestWithChain[]>>;
}

export function useQuestToggle({ supabase, characterId, dofusId, setQuests }: Params) {
  const handleToggle = useCallback(
    async (questId: string, completed: boolean) => {
      if (!characterId) return;
      setQuests((prev) =>
        prev.map((q) => (q.id === questId ? { ...q, is_completed: completed } : q))
      );
      try {
        await toggleQuestCompletion(supabase, characterId, questId, completed);
      } catch {
        setQuests((prev) =>
          prev.map((q) => (q.id === questId ? { ...q, is_completed: !completed } : q))
        );
      }
    },
    [supabase, characterId, setQuests]
  );

  const handleBulkComplete = useCallback(
    async (section: QuestSection) => {
      if (!characterId) return;
      setQuests((prev) =>
        prev.map((q) =>
          q.chain.section === section ? { ...q, is_completed: true } : q
        )
      );
      try {
        await bulkCompleteSection(supabase, characterId, dofusId, section);
      } catch {
        const fresh = await getQuestsForDofus(supabase, dofusId, characterId);
        setQuests(fresh);
      }
    },
    [supabase, characterId, dofusId, setQuests]
  );

  return { handleToggle, handleBulkComplete };
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```bash
pnpm --filter @dofus-tracker/ui test
```

Expected: PASS — tous les tests passent.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/hooks/useQuestToggle.ts packages/ui/__tests__/useQuestToggle.test.ts
git commit -m "feat(ui): add useQuestToggle hook with optimistic update and rollback"
```

---

## Task 5 — Hook useResources

**Files:**
- Create: `packages/ui/src/hooks/useResources.ts`
- Create: `packages/ui/__tests__/useResources.test.ts`

- [ ] **Step 1: Écrire les tests**

Créer `packages/ui/__tests__/useResources.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useResources } from "../src/hooks/useResources.js";
import type { Resource } from "@dofus-tracker/types";

function makeResource(
  id: string,
  quantity: number,
  isKamas = false
): Resource {
  return {
    id,
    name: `Resource ${id}`,
    icon_emoji: "💎",
    dofus_id: "dofus-1",
    quantity_per_character: quantity,
    is_kamas: isKamas,
  };
}

describe("useResources", () => {
  it("multiplier starts at 1", () => {
    const { result } = renderHook(() => useResources([]));
    expect(result.current.multiplier).toBe(1);
  });

  it("separates items from kamas", () => {
    const resources = [
      makeResource("r1", 10, false),
      makeResource("kamas", 5000, true),
    ];
    const { result } = renderHook(() => useResources(resources));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.kamas).toHaveLength(1);
    expect(result.current.items[0].id).toBe("r1");
    expect(result.current.kamas[0].id).toBe("kamas");
  });

  it("getQuantity multiplies by multiplier", () => {
    const resources = [makeResource("r1", 10)];
    const { result } = renderHook(() => useResources(resources));
    expect(result.current.getQuantity(resources[0])).toBe(10);

    act(() => result.current.setMultiplier(3));
    expect(result.current.getQuantity(resources[0])).toBe(30);
  });

  it("setMultiplier updates multiplier", () => {
    const { result } = renderHook(() => useResources([]));
    act(() => result.current.setMultiplier(5));
    expect(result.current.multiplier).toBe(5);
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
pnpm --filter @dofus-tracker/ui test
```

Expected: FAIL — "Cannot find module '../src/hooks/useResources.js'"

- [ ] **Step 3: Implémenter `packages/ui/src/hooks/useResources.ts`**

```typescript
import { useState } from "react";
import type { Resource } from "@dofus-tracker/types";

export function useResources(resources: Resource[]) {
  const [multiplier, setMultiplier] = useState(1);

  const items = resources.filter((r) => !r.is_kamas);
  const kamas = resources.filter((r) => r.is_kamas);
  const getQuantity = (r: Resource) => r.quantity_per_character * multiplier;

  return { multiplier, setMultiplier, items, kamas, getQuantity };
}
```

- [ ] **Step 4: Vérifier que tous les tests passent**

```bash
pnpm --filter @dofus-tracker/ui test
```

Expected: PASS — tous les tests (characterStore + useQuestToggle + useResources) passent.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/hooks/useResources.ts packages/ui/__tests__/useResources.test.ts
git commit -m "feat(ui): add useResources hook with multiplier"
```

---

## Task 6 — Scaffold apps/mobile

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/eas.json`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/metro.config.js`
- Create: `apps/mobile/tailwind.config.js`
- Create: `apps/mobile/global.css`
- Create: `apps/mobile/.env.example`

- [ ] **Step 1: Créer `apps/mobile/package.json`**

```json
{
  "name": "@dofus-tracker/mobile",
  "version": "0.0.1",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@dofus-tracker/db": "workspace:*",
    "@dofus-tracker/types": "workspace:*",
    "@dofus-tracker/ui": "workspace:*",
    "@gorhom/bottom-sheet": "^4.6.4",
    "@react-native-async-storage/async-storage": "1.23.1",
    "@supabase/supabase-js": "^2.43.4",
    "expo": "~51.0.0",
    "expo-auth-session": "~5.5.2",
    "expo-blur": "~13.0.2",
    "expo-crypto": "~13.0.2",
    "expo-font": "~12.0.9",
    "expo-image": "~1.12.15",
    "expo-linear-gradient": "~13.0.2",
    "expo-linking": "~6.3.1",
    "expo-router": "~3.5.23",
    "expo-status-bar": "~1.12.1",
    "expo-web-browser": "~13.0.3",
    "nativewind": "^4.0.1",
    "react": "18.2.0",
    "react-native": "0.74.5",
    "react-native-gesture-handler": "~2.16.1",
    "react-native-reanimated": "~3.10.1",
    "react-native-safe-area-context": "4.10.5",
    "react-native-screens": "3.31.1",
    "tailwindcss": "^3.4.4",
    "zustand": "^4.5.4"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~18.2.79",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Créer `apps/mobile/tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.d.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 3: Créer `apps/mobile/app.json`**

```json
{
  "expo": {
    "name": "Dofus Tracker",
    "slug": "dofus-tracker",
    "version": "1.0.0",
    "scheme": "dofustracker",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "backgroundColor": "#080e0a"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.dofustracker.app"
    },
    "android": {
      "package": "com.dofustracker.app",
      "adaptiveIcon": {
        "backgroundColor": "#080e0a"
      }
    },
    "plugins": [
      "expo-router",
      "expo-font",
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "1.9.24"
          }
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 4: Créer `apps/mobile/eas.json`**

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

- [ ] **Step 5: Créer `apps/mobile/babel.config.js`**

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    plugins: ["react-native-reanimated/plugin"],
  };
};
```

- [ ] **Step 6: Créer `apps/mobile/metro.config.js`**

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

- [ ] **Step 7: Créer `apps/mobile/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "dofus-green": "#4ade80",
        "dofus-dark": "#080e0a",
        "glass-bg": "rgba(8,16,10,0.64)",
        "glass-border": "rgba(255,255,255,0.09)",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 8: Créer `apps/mobile/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9: Créer `apps/mobile/.env.example`**

```
EXPO_PUBLIC_SUPABASE_URL=https://fmhfivaxlairclolwmby.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 10: Créer le dossier assets placeholder**

```bash
mkdir -p apps/mobile/assets
# Créer une image icon.png placeholder (1024x1024)
# L'image officielle sera ajoutée plus tard — pour l'instant on crée un placeholder
touch apps/mobile/assets/icon.png
touch apps/mobile/assets/splash.png
```

- [ ] **Step 11: Installer les dépendances**

```bash
pnpm install
```

Expected: pas d'erreur.

- [ ] **Step 12: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): scaffold Expo app — package.json, configs, NativeWind, EAS"
```

---

## Task 7 — Supabase client mobile + auth gate

**Files:**
- Create: `apps/mobile/lib/supabase.ts`
- Create: `apps/mobile/lib/stores/characterStore.ts`
- Create: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Créer `apps/mobile/lib/supabase.ts`**

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 2: Créer `apps/mobile/lib/stores/characterStore.ts`**

```typescript
import { createCharacterStore } from "@dofus-tracker/ui";
import { createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useCharacterStore = createCharacterStore(
  createJSONStorage(() => AsyncStorage)
);
```

- [ ] **Step 3: Créer `apps/mobile/app/_layout.tsx`**

```typescript
import "../../global.css";
import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { Session } from "@supabase/supabase-js";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { supabase } from "@/lib/supabase";

export default function RootLayout() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/login");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (session) {
          router.replace("/(tabs)");
        } else {
          router.replace("/(auth)/login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @dofus-tracker/mobile typecheck
```

Expected: pas d'erreur TypeScript.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/ apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add Supabase client, character store, root auth gate"
```

---

## Task 8 — Écrans auth

**Files:**
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(auth)/login.tsx`
- Create: `apps/mobile/app/(auth)/register.tsx`

- [ ] **Step 1: Créer `apps/mobile/app/(auth)/_layout.tsx`**

```typescript
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#080e0a" },
      }}
    />
  );
}
```

- [ ] **Step 2: Créer `apps/mobile/app/(auth)/login.tsx`**

```typescript
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = makeRedirectUri({ scheme: "dofustracker", path: "auth/callback" });

  async function handleLogin() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function handleOAuth(provider: "google" | "discord") {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUri, skipBrowserRedirect: true },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const access_token = url.searchParams.get("access_token") ?? url.hash.match(/access_token=([^&]*)/)?.[1];
        const refresh_token = url.searchParams.get("refresh_token") ?? url.hash.match(/refresh_token=([^&]*)/)?.[1];
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      }
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-dofus-dark"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          <Text className="text-4xl font-black text-dofus-green text-center mb-2">
            Dofus Tracker
          </Text>
          <Text className="text-gray-400 text-center mb-10">
            Suis ta progression vers tous les Dofus
          </Text>

          {error && (
            <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          )}

          <TextInput
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3"
            placeholder="Email"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-6"
            placeholder="Mot de passe"
            placeholderTextColor="#6b7280"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="bg-dofus-green rounded-xl py-3.5 items-center mb-4"
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text className="text-black font-bold text-base">Se connecter</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOAuth("discord")}
            disabled={loading}
            className="bg-[#5865f2]/20 border border-[#5865f2]/40 rounded-xl py-3.5 items-center mb-3"
          >
            <Text className="text-[#5865f2] font-semibold">Continuer avec Discord</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOAuth("google")}
            disabled={loading}
            className="bg-white/5 border border-white/10 rounded-xl py-3.5 items-center mb-8"
          >
            <Text className="text-white font-semibold">Continuer avec Google</Text>
          </TouchableOpacity>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text className="text-gray-400 text-center text-sm">
                Pas de compte ?{" "}
                <Text className="text-dofus-green font-semibold">Créer un compte</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 3: Créer `apps/mobile/app/(auth)/register.tsx`**

```typescript
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleRegister() {
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-dofus-dark"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          <Text className="text-3xl font-black text-white text-center mb-2">
            Créer un compte
          </Text>
          <Text className="text-gray-400 text-center mb-10">
            Via Discord ou Google ? Utilise le bouton sur la page de connexion.
          </Text>

          {success ? (
            <View className="bg-dofus-green/10 border border-dofus-green/30 rounded-xl px-4 py-6 items-center">
              <Text className="text-dofus-green font-semibold text-base mb-2">Compte créé !</Text>
              <Text className="text-gray-400 text-sm text-center">
                Vérifie ton email pour confirmer ton compte.
              </Text>
            </View>
          ) : (
            <>
              {error && (
                <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
                  <Text className="text-red-400 text-sm">{error}</Text>
                </View>
              )}

              <TextInput
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3"
                placeholder="Email"
                placeholderTextColor="#6b7280"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3"
                placeholder="Mot de passe"
                placeholderTextColor="#6b7280"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TextInput
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-6"
                placeholder="Confirmer le mot de passe"
                placeholderTextColor="#6b7280"
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
              />

              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading}
                className="bg-dofus-green rounded-xl py-3.5 items-center mb-6"
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text className="text-black font-bold text-base">Créer le compte</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-gray-400 text-center text-sm">
                Déjà un compte ?{" "}
                <Text className="text-dofus-green font-semibold">Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @dofus-tracker/mobile typecheck
```

Expected: pas d'erreur TypeScript.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(auth\)/
git commit -m "feat(mobile): add auth screens — login (email + OAuth) and register"
```

---

## Task 9 — Composants partagés

**Files:**
- Create: `apps/mobile/components/shared/EggImage.tsx`
- Create: `apps/mobile/components/shared/ProgressBar.tsx`
- Create: `apps/mobile/components/shared/QuestTypeBadge.tsx`
- Create: `apps/mobile/components/shared/QuestGroupBox.tsx`
- Create: `apps/mobile/components/shared/CharacterSelector.tsx`

- [ ] **Step 1: Créer `apps/mobile/components/shared/EggImage.tsx`**

```typescript
import { useEffect } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface Props {
  imageUrl: string | null;
  color: string;
  size?: number;
}

export function EggImage({ imageUrl, color, size = 80 }: Props) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, animatedStyle]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size }}
          contentFit="contain"
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: 0.7,
            backgroundColor: color,
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 10,
          }}
        />
      )}
    </Animated.View>
  );
}
```

- [ ] **Step 2: Créer `apps/mobile/components/shared/ProgressBar.tsx`**

```typescript
import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  useEffect,
} from "react-native-reanimated";

interface Props {
  pct: number;
  color: string;
  showLabel?: boolean;
}

export function ProgressBar({ pct, color, showLabel = false }: Props) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(pct, { duration: 600 });
  }, [pct]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View>
      {showLabel && (
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-xs text-gray-400">{Math.round(pct)}%</Text>
        </View>
      )}
      <View className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <Animated.View
          style={[
            {
              height: "100%",
              borderRadius: 999,
              backgroundColor: color,
            },
            barStyle,
          ]}
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Créer `apps/mobile/components/shared/QuestTypeBadge.tsx`**

```typescript
import { View, Text } from "react-native";
import { QUEST_TYPE_BADGE_CONFIG } from "@dofus-tracker/ui";
import type { QuestType } from "@dofus-tracker/types";

interface Props {
  type: QuestType;
  combatCount?: number | null;
}

export function QuestTypeBadge({ type, combatCount }: Props) {
  const { label, color } = QUEST_TYPE_BADGE_CONFIG[type];
  const displayLabel =
    type === "combat_solo" && combatCount && combatCount > 1
      ? `${label} ×${combatCount}`
      : label;

  return (
    <View
      style={{
        backgroundColor: `${color}22`,
        borderColor: `${color}44`,
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: "600" }}>{displayLabel}</Text>
    </View>
  );
}
```

- [ ] **Step 4: Créer `apps/mobile/components/shared/QuestGroupBox.tsx`**

```typescript
import { View, Text } from "react-native";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function QuestGroupBox({ children }: Props) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#f9731644",
        backgroundColor: "#f9731608",
        borderRadius: 12,
        padding: 8,
        marginBottom: 4,
      }}
    >
      <Text style={{ color: "#f97316", fontSize: 10, fontWeight: "700", marginBottom: 6 }}>
        FAIRE ENSEMBLE
      </Text>
      {children}
    </View>
  );
}
```

- [ ] **Step 5: Créer `apps/mobile/components/shared/CharacterSelector.tsx`**

```typescript
import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import { useCharacterStore } from "@/lib/stores/characterStore";
import type { Character } from "@dofus-tracker/types";

interface Props {
  characters: Character[];
}

export function CharacterSelector({ characters }: Props) {
  const [open, setOpen] = useState(false);
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const setActiveCharacterId = useCharacterStore((s) => s.setActiveCharacterId);

  const active = characters.find((c) => c.id === activeCharacterId) ?? characters[0] ?? null;

  if (characters.length === 0) {
    return <Text className="text-sm text-gray-400">Aucun personnage</Text>;
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5"
      >
        <Text className="text-dofus-green">⚔</Text>
        <Text className="text-white text-sm">{active?.name ?? "Choisir"}</Text>
        <Text className="text-gray-400 text-xs">{active?.character_class}</Text>
        <Text className="text-gray-500 text-xs">▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          className="flex-1 bg-black/60 justify-center items-center px-8"
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View className="bg-[#0d1f12] border border-white/10 rounded-2xl overflow-hidden w-full max-w-sm">
            <Text className="px-4 py-3 text-sm font-semibold text-gray-400 border-b border-white/5">
              Personnage actif
            </Text>
            <FlatList
              data={characters}
              keyExtractor={(c) => c.id}
              renderItem={({ item: char }) => (
                <TouchableOpacity
                  onPress={() => { setActiveCharacterId(char.id); setOpen(false); }}
                  className="flex-row items-center justify-between px-4 py-3 border-b border-white/5"
                >
                  <View className="flex-row items-center gap-2">
                    {char.id === active?.id && (
                      <View className="w-1.5 h-1.5 rounded-full bg-dofus-green" />
                    )}
                    <Text className={char.id === active?.id ? "text-dofus-green font-semibold" : "text-white"}>
                      {char.name}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-400">{char.character_class}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
```

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @dofus-tracker/mobile typecheck
```

Expected: pas d'erreur TypeScript.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/components/shared/
git commit -m "feat(mobile): add shared components — EggImage, ProgressBar, badges, CharacterSelector"
```

---

## Task 10 — Tab bar + grille Dofus

**Files:**
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/components/home/DofusCard.tsx`
- Create: `apps/mobile/components/home/DofusGrid.tsx`
- Create: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Créer `apps/mobile/app/(tabs)/_layout.tsx`**

```typescript
import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabsLayout() {
  return (
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
  );
}
```

- [ ] **Step 2: Créer `apps/mobile/components/home/DofusCard.tsx`**

```typescript
import { TouchableOpacity, View, Text } from "react-native";
import { router } from "expo-router";
import { BlurView } from "expo-blur";
import { EggImage } from "@/components/shared/EggImage";
import { ProgressBar } from "@/components/shared/ProgressBar";
import type { Dofus, DofusProgress } from "@dofus-tracker/types";

interface Props {
  dofus: Dofus;
  progress: DofusProgress | null;
}

export function DofusCard({ dofus, progress }: Props) {
  const pct = progress?.progress_pct ?? 0;
  const completed = progress?.completed_quests ?? 0;
  const total = progress?.total_quests ?? 0;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/dofus/${dofus.slug}`)}
      className="flex-1 m-2"
      activeOpacity={0.8}
    >
      <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden flex-1">
        <View
          className="p-4 flex-1"
          style={{ backgroundColor: "rgba(8,16,10,0.55)" }}
        >
          <View className="items-center mb-3">
            <EggImage imageUrl={dofus.image_url} color={dofus.color} size={64} />
          </View>

          <Text className="text-white font-bold text-center text-sm leading-tight mb-0.5">
            {dofus.name}
          </Text>
          <Text className="text-gray-400 text-xs text-center capitalize mb-3">
            {dofus.type}
          </Text>

          <View className="mt-auto">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-xs text-gray-400">{completed}/{total}</Text>
              <Text className="text-xs font-bold" style={{ color: dofus.color }}>
                {pct}%
              </Text>
            </View>
            <ProgressBar pct={pct} color={dofus.color} />
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 3: Créer `apps/mobile/components/home/DofusGrid.tsx`**

```typescript
import { FlatList, RefreshControl, View } from "react-native";
import { DofusCard } from "./DofusCard";
import type { Dofus, DofusProgress } from "@dofus-tracker/types";

interface Props {
  dofusList: Dofus[];
  progressMap: Map<string, DofusProgress>;
  refreshing: boolean;
  onRefresh: () => void;
}

export function DofusGrid({ dofusList, progressMap, refreshing, onRefresh }: Props) {
  return (
    <FlatList
      data={dofusList}
      keyExtractor={(d) => d.id}
      numColumns={2}
      renderItem={({ item }) => (
        <DofusCard dofus={item} progress={progressMap.get(item.id) ?? null} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#4ade80"
        />
      }
      contentContainerStyle={{ padding: 8 }}
    />
  );
}
```

- [ ] **Step 4: Créer `apps/mobile/app/(tabs)/index.tsx`**

```typescript
import { useEffect, useState, useCallback } from "react";
import { View, Text, ImageBackground } from "react-native";
import { Stack } from "expo-router";
import { getDofusList, getDofusProgressForCharacter, getCharacters } from "@dofus-tracker/db";
import { DofusGrid } from "@/components/home/DofusGrid";
import { CharacterSelector } from "@/components/shared/CharacterSelector";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import type { Dofus, DofusProgress, Character } from "@dofus-tracker/types";

export default function MesDofusScreen() {
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const [dofusList, setDofusList] = useState<Dofus[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, DofusProgress>>(new Map());
  const [characters, setCharacters] = useState<Character[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRefreshing(false); return; }

    const [allDofus, allChars] = await Promise.all([
      getDofusList(supabase),
      getCharacters(supabase, user.id),
    ]);
    setDofusList(allDofus);
    setCharacters(allChars);

    if (activeCharacterId) {
      const progress = await getDofusProgressForCharacter(supabase, activeCharacterId);
      const map = new Map(progress.map((p) => [p.dofus_id, p]));
      setProgressMap(map);
    }
    setRefreshing(false);
  }, [activeCharacterId]);

  useEffect(() => { loadData(); }, [loadData]);

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
          dofusList={dofusList}
          progressMap={progressMap}
          refreshing={refreshing}
          onRefresh={loadData}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter @dofus-tracker/mobile typecheck
```

Expected: pas d'erreur TypeScript.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/\(tabs\)/_layout.tsx apps/mobile/app/\(tabs\)/index.tsx apps/mobile/components/home/
git commit -m "feat(mobile): add tab bar, DofusCard, DofusGrid, and Mes Dofus screen"
```

---

## Task 11 — Composants détail Dofus

**Files:**
- Create: `apps/mobile/components/dofus/DofusHeader.tsx`
- Create: `apps/mobile/components/dofus/QuestItem.tsx`
- Create: `apps/mobile/components/dofus/QuestSection.tsx`

- [ ] **Step 1: Créer `apps/mobile/components/dofus/DofusHeader.tsx`**

```typescript
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { BlurView } from "expo-blur";
import { EggImage } from "@/components/shared/EggImage";
import { ProgressBar } from "@/components/shared/ProgressBar";
import type { Dofus, QuestWithChain } from "@dofus-tracker/types";

interface Props {
  dofus: Dofus;
  allDofus: Dofus[];
  quests: QuestWithChain[];
  completedCount: number;
}

export function DofusHeader({ dofus, allDofus, quests, completedCount }: Props) {
  const total = quests.length;
  const remaining = total - completedCount;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const sharedDofusIds = new Set(quests.flatMap((q) => q.shared_dofus_ids));
  const sharedDofus = allDofus.filter(
    (d) => sharedDofusIds.has(d.id) && d.id !== dofus.id
  );
  const sharedCountPerDofus = new Map<string, number>();
  for (const quest of quests) {
    for (const did of quest.shared_dofus_ids) {
      sharedCountPerDofus.set(did, (sharedCountPerDofus.get(did) ?? 0) + 1);
    }
  }

  return (
    <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden mb-4">
      <View className="p-5" style={{ backgroundColor: "rgba(8,16,10,0.55)" }}>
        <View className="flex-row items-start gap-4 mb-4">
          <EggImage imageUrl={dofus.image_url} color={dofus.color} size={80} />
          <View className="flex-1">
            <Text className="text-2xl font-black text-white leading-tight">{dofus.name}</Text>
            <Text className="text-xs text-gray-400 capitalize mt-0.5">{dofus.type}</Text>
            {dofus.description ? (
              <Text className="text-sm text-gray-300 mt-2 leading-relaxed">{dofus.description}</Text>
            ) : null}
          </View>
        </View>

        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-dofus-green text-sm font-semibold">{completedCount} complétées</Text>
          <Text className="text-gray-400 text-sm">{remaining} restantes</Text>
          <Text className="text-xl font-extrabold" style={{ color: dofus.color }}>{pct}%</Text>
        </View>
        <ProgressBar pct={pct} color={dofus.color} />

        {sharedDofus.length > 0 && (
          <View className="mt-4 pt-4 border-t border-white/5">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Quêtes partagées avec
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {sharedDofus.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => router.push(`/dofus/${d.slug}`)}
                  style={{
                    backgroundColor: `${d.color}22`,
                    borderColor: `${d.color}44`,
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: d.color, fontSize: 12, fontWeight: "500" }}>
                    {d.name} ×{sharedCountPerDofus.get(d.id)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </BlurView>
  );
}
```

- [ ] **Step 2: Créer `apps/mobile/components/dofus/QuestItem.tsx`**

```typescript
import { View, Text, Pressable, Linking } from "react-native";
import { QuestTypeBadge } from "@/components/shared/QuestTypeBadge";
import type { QuestWithChain } from "@dofus-tracker/types";

interface Props {
  quest: QuestWithChain;
  dofusColor: string;
  onToggle: (questId: string, completed: boolean) => void;
}

export function QuestItem({ quest, dofusColor: _dofusColor, onToggle }: Props) {
  const { chain, is_completed, shared_dofus_ids } = quest;

  function handlePress() {
    if (quest.dofuspourlesnoobs_url) {
      Linking.openURL(quest.dofuspourlesnoobs_url);
    }
  }

  return (
    <View
      className="flex-row items-start gap-3 px-3 py-2.5 rounded-xl mb-1"
      style={{
        backgroundColor: is_completed ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
      }}
    >
      {/* Checkbox */}
      <Pressable
        onPress={() => onToggle(quest.id, !is_completed)}
        className="mt-0.5"
        hitSlop={8}
      >
        <View
          className="w-4 h-4 rounded border items-center justify-center"
          style={{
            borderColor: is_completed ? "#4ade80" : "rgba(255,255,255,0.2)",
            backgroundColor: is_completed ? "#4ade80" : "transparent",
          }}
        >
          {is_completed && <Text className="text-black text-xs font-bold leading-none">✓</Text>}
        </View>
      </Pressable>

      {/* Quest info */}
      <View className="flex-1 min-w-0 gap-1.5">
        <View className="flex-row items-center flex-wrap gap-2">
          <Pressable onPress={handlePress}>
            <Text
              className={`text-sm font-medium ${is_completed ? "line-through text-gray-500" : "text-white"}`}
            >
              {quest.name}
            </Text>
          </Pressable>
          {shared_dofus_ids.length > 0 && (
            <View
              className="rounded-md px-1.5 py-0.5"
              style={{ backgroundColor: "#3b82f622", borderColor: "#3b82f644", borderWidth: 1 }}
            >
              <Text className="text-xs font-medium text-blue-400">
                ×{shared_dofus_ids.length + 1}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row flex-wrap gap-1.5">
          {chain.quest_types.map((type) => (
            <QuestTypeBadge key={type} type={type} combatCount={chain.combat_count} />
          ))}
          {chain.is_avoidable && (
            <View className="bg-white/5 border border-white/10 rounded-md px-2 py-0.5">
              <Text className="text-xs text-gray-400">Évitable</Text>
            </View>
          )}
        </View>
      </View>

      <Text className="text-xs text-gray-600 shrink-0 mt-0.5">#{chain.order_index}</Text>
    </View>
  );
}
```

- [ ] **Step 3: Créer `apps/mobile/components/dofus/QuestSection.tsx`**

```typescript
import { View, Text, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import { QuestItem } from "./QuestItem";
import { QuestGroupBox } from "@/components/shared/QuestGroupBox";
import type { QuestWithChain } from "@dofus-tracker/types";

interface Props {
  title: string;
  quests: QuestWithChain[];
  dofusColor: string;
  onToggle: (questId: string, completed: boolean) => void;
  onBulkComplete: () => void;
}

export function QuestSection({ title, quests, dofusColor, onToggle, onBulkComplete }: Props) {
  // Group quests by group_id (null = solo)
  const rendered: React.ReactNode[] = [];
  const seen = new Set<string>();

  for (const quest of quests) {
    const gid = quest.chain.group_id;
    if (gid && !seen.has(gid)) {
      seen.add(gid);
      const group = quests.filter((q) => q.chain.group_id === gid);
      rendered.push(
        <QuestGroupBox key={gid}>
          {group.map((q) => (
            <QuestItem key={q.id} quest={q} dofusColor={dofusColor} onToggle={onToggle} />
          ))}
        </QuestGroupBox>
      );
    } else if (!gid) {
      rendered.push(
        <QuestItem key={quest.id} quest={quest} dofusColor={dofusColor} onToggle={onToggle} />
      );
    }
  }

  return (
    <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden mb-4">
      <View className="p-4" style={{ backgroundColor: "rgba(8,16,10,0.55)" }}>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-bold text-white">{title}</Text>
          <TouchableOpacity
            onPress={onBulkComplete}
            className="px-3 py-1 rounded-lg bg-white/5 border border-white/10"
          >
            <Text className="text-xs text-gray-400">Tout cocher</Text>
          </TouchableOpacity>
        </View>
        {rendered}
      </View>
    </BlurView>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @dofus-tracker/mobile typecheck
```

Expected: pas d'erreur TypeScript.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/dofus/
git commit -m "feat(mobile): add DofusHeader, QuestItem, QuestSection components"
```

---

## Task 12 — Page détail Dofus + panel ressources

**Files:**
- Create: `apps/mobile/components/dofus/ResourceSection.tsx`
- Create: `apps/mobile/components/resources/ResourceBottomSheet.tsx`
- Create: `apps/mobile/app/dofus/[slug].tsx`

- [ ] **Step 1: Créer `apps/mobile/components/resources/ResourceBottomSheet.tsx`**

```typescript
import { forwardRef, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useResources } from "@dofus-tracker/ui";
import type { Resource } from "@dofus-tracker/types";

interface Props {
  resources: Resource[];
  dofusColor: string;
}

const PRESETS = [1, 2, 3, 4, 5];

export const ResourceBottomSheet = forwardRef<BottomSheet, Props>(
  function ResourceBottomSheet({ resources, dofusColor }, ref) {
    const { multiplier, setMultiplier, items, kamas, getQuantity } = useResources(resources);

    const formatNumber = (n: number) =>
      n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

    const renderItem = useCallback(
      ({ item }: { item: Resource }) => (
        <View className="flex-row items-center gap-3 px-5 py-2.5 border-b border-white/5">
          <Text className="text-xl w-7 text-center">{item.icon_emoji}</Text>
          <Text className="text-sm text-white flex-1">{item.name}</Text>
          <Text className="text-sm font-bold" style={{ color: dofusColor }}>
            {formatNumber(getQuantity(item))}
          </Text>
        </View>
      ),
      [dofusColor, getQuantity]
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["45%", "90%"]}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#0d1f12" }}
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.2)" }}
      >
        <BottomSheetView>
          <Text className="px-5 py-3 text-base font-bold text-white border-b border-white/5">
            Ressources nécessaires
          </Text>

          {/* Multiplier */}
          <View className="flex-row gap-2 px-5 py-3 border-b border-white/5">
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setMultiplier(p)}
                className="flex-1 py-1.5 rounded-lg items-center"
                style={{
                  backgroundColor:
                    multiplier === p ? dofusColor : "rgba(255,255,255,0.05)",
                }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: multiplier === p ? "#000" : "#9ca3af" }}
                >
                  ×{p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={items}
            keyExtractor={(r) => r.id}
            renderItem={renderItem}
            scrollEnabled={false}
          />

          {kamas.map((k) => (
            <View key={k.id} className="flex-row items-center gap-3 px-5 py-3 bg-yellow-500/5 border-t border-white/5">
              <Text className="text-xl w-7 text-center">{k.icon_emoji}</Text>
              <Text className="text-sm text-white flex-1">{k.name}</Text>
              <Text className="text-sm font-bold text-yellow-400">
                {formatNumber(getQuantity(k))}
              </Text>
            </View>
          ))}

          <Text className="text-xs text-gray-500 text-center py-3">
            {items.length} type{items.length > 1 ? "s" : ""} de ressources
            {multiplier > 1 ? ` · ×${multiplier} personnages` : ""}
          </Text>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
```

- [ ] **Step 2: Créer `apps/mobile/components/dofus/ResourceSection.tsx`**

```typescript
import { View, Text, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import type { Resource } from "@dofus-tracker/types";

interface Props {
  resources: Resource[];
  onOpenSheet: () => void;
}

export function ResourceSection({ resources, onOpenSheet }: Props) {
  return (
    <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden mb-8">
      <View className="p-4" style={{ backgroundColor: "rgba(8,16,10,0.55)" }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-white">
            Ressources ({resources.length})
          </Text>
          <TouchableOpacity
            onPress={onOpenSheet}
            className="bg-dofus-green/20 border border-dofus-green/40 px-3 py-1.5 rounded-xl"
          >
            <Text className="text-dofus-green text-sm font-semibold">Voir tout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BlurView>
  );
}
```

- [ ] **Step 3: Créer `apps/mobile/app/dofus/[slug].tsx`**

```typescript
import { useEffect, useState, useRef, useCallback } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import BottomSheet from "@gorhom/bottom-sheet";
import {
  getDofusList,
  getDofusBySlug,
  getQuestsForDofus,
  getResourcesForDofus,
} from "@dofus-tracker/db";
import { useQuestToggle } from "@dofus-tracker/ui";
import { DofusHeader } from "@/components/dofus/DofusHeader";
import { QuestSection } from "@/components/dofus/QuestSection";
import { ResourceSection } from "@/components/dofus/ResourceSection";
import { ResourceBottomSheet } from "@/components/resources/ResourceBottomSheet";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import type { Dofus, QuestWithChain, Resource, QuestSection as QuestSectionType } from "@dofus-tracker/types";

export default function DofusDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [dofus, setDofus] = useState<Dofus | null>(null);
  const [allDofus, setAllDofus] = useState<Dofus[]>([]);
  const [quests, setQuests] = useState<QuestWithChain[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const { handleToggle, handleBulkComplete } = useQuestToggle({
    supabase,
    characterId: activeCharacterId,
    dofusId: dofus?.id ?? "",
    setQuests,
  });

  const loadData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    const [foundDofus, allD] = await Promise.all([
      getDofusBySlug(supabase, slug),
      getDofusList(supabase),
    ]);
    setDofus(foundDofus);
    setAllDofus(allD);

    if (foundDofus && activeCharacterId) {
      const [q, r] = await Promise.all([
        getQuestsForDofus(supabase, foundDofus.id, activeCharacterId),
        getResourcesForDofus(supabase, foundDofus.id),
      ]);
      setQuests(q);
      setResources(r);
    }
    setLoading(false);
  }, [slug, activeCharacterId]);

  useEffect(() => { loadData(); }, [loadData]);

  const prerequisites = quests.filter((q) => q.chain.section === "prerequisite");
  const mainQuests = quests.filter((q) => q.chain.section === "main");
  const completedCount = quests.filter((q) => q.is_completed).length;

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
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
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
            onToggle={handleToggle}
            onBulkComplete={() => handleBulkComplete("prerequisite" as QuestSectionType)}
          />
        )}
        {mainQuests.length > 0 && (
          <QuestSection
            title="Chaîne principale"
            quests={mainQuests}
            dofusColor={dofus.color}
            onToggle={handleToggle}
            onBulkComplete={() => handleBulkComplete("main" as QuestSectionType)}
          />
        )}
        <ResourceSection
          resources={resources}
          onOpenSheet={() => bottomSheetRef.current?.expand()}
        />
      </ScrollView>

      <ResourceBottomSheet
        ref={bottomSheetRef}
        resources={resources}
        dofusColor={dofus.color}
      />
    </View>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @dofus-tracker/mobile typecheck
```

Expected: pas d'erreur TypeScript.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/dofus/ apps/mobile/components/dofus/ResourceSection.tsx apps/mobile/components/resources/
git commit -m "feat(mobile): add Dofus detail screen with quests, toggle, and resource bottom sheet"
```

---

## Task 13 — Tab Ressources

**Files:**
- Create: `apps/mobile/app/(tabs)/resources.tsx`

- [ ] **Step 1: Créer `apps/mobile/app/(tabs)/resources.tsx`**

```typescript
import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, FlatList } from "react-native";
import { Stack } from "expo-router";
import BottomSheet from "@gorhom/bottom-sheet";
import { getDofusList, getResourcesForDofus } from "@dofus-tracker/db";
import { ResourceBottomSheet } from "@/components/resources/ResourceBottomSheet";
import { supabase } from "@/lib/supabase";
import type { Dofus, Resource } from "@dofus-tracker/types";
import { TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";

interface DofusResources {
  dofus: Dofus;
  resources: Resource[];
}

export default function ResourcesScreen() {
  const [data, setData] = useState<DofusResources[]>([]);
  const [selected, setSelected] = useState<DofusResources | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const loadData = useCallback(async () => {
    const allDofus = await getDofusList(supabase);
    const results = await Promise.all(
      allDofus.map(async (dofus) => ({
        dofus,
        resources: await getResourcesForDofus(supabase, dofus.id),
      }))
    );
    setData(results.filter((r) => r.resources.length > 0));
  }, []);

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
          <TouchableOpacity onPress={() => openSheet(item)} className="mb-3">
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

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @dofus-tracker/mobile typecheck
```

Expected: pas d'erreur TypeScript.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/resources.tsx
git commit -m "feat(mobile): add Resources tab with per-Dofus resource bottom sheet"
```

---

## Task 14 — Tab Profil

**Files:**
- Create: `apps/mobile/app/(tabs)/profile.tsx`

- [ ] **Step 1: Créer `apps/mobile/app/(tabs)/profile.tsx`**

```typescript
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Stack } from "expo-router";
import { BlurView } from "expo-blur";
import { createCharacter, deleteCharacter, getCharacters } from "@dofus-tracker/db";
import { DOFUS_CLASSES } from "@dofus-tracker/ui";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import type { Character } from "@dofus-tracker/types";

export default function ProfileScreen() {
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const setActiveCharacterId = useCharacterStore((s) => s.setActiveCharacterId);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [characterClass, setCharacterClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? null);
      getCharacters(supabase, user.id).then(setCharacters);
    });
  }, []);

  async function handleCreate() {
    if (!name.trim() || !characterClass.trim() || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const newChar = await createCharacter(supabase, userId, name.trim(), characterClass.trim());
      setCharacters((prev) => [...prev, newChar]);
      if (characters.length === 0) setActiveCharacterId(newChar.id);
      setName("");
      setCharacterClass("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(charId: string) {
    try {
      await deleteCharacter(supabase, charId);
      setCharacters((prev) => prev.filter((c) => c.id !== charId));
      if (activeCharacterId === charId) {
        const remaining = characters.filter((c) => c.id !== charId);
        setActiveCharacterId(remaining[0]?.id ?? null);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <View className="flex-1 bg-dofus-dark">
      <Stack.Screen options={{ title: "Profil" }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Account info */}
        <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden mb-4">
          <View className="p-4" style={{ backgroundColor: "rgba(8,16,10,0.55)" }}>
            <Text className="text-base font-bold text-white mb-1">Mon compte</Text>
            <Text className="text-sm text-gray-400">{email}</Text>
          </View>
        </BlurView>

        {/* Characters list */}
        <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden mb-4">
          <View style={{ backgroundColor: "rgba(8,16,10,0.55)" }}>
            <View className="px-4 py-3 border-b border-white/5">
              <Text className="text-base font-bold text-white">Mes personnages</Text>
            </View>
            {characters.length === 0 ? (
              <Text className="text-sm text-gray-400 text-center py-6">
                Aucun personnage — crée-en un ci-dessous.
              </Text>
            ) : (
              <FlatList
                data={characters}
                keyExtractor={(c) => c.id}
                scrollEnabled={false}
                renderItem={({ item: char }) => (
                  <View
                    className="flex-row items-center justify-between px-4 py-3 border-b border-white/5"
                    style={char.id === activeCharacterId ? { backgroundColor: "rgba(74,222,128,0.05)" } : {}}
                  >
                    <View className="flex-row items-center gap-2">
                      {char.id === activeCharacterId && (
                        <View className="w-1.5 h-1.5 rounded-full bg-dofus-green" />
                      )}
                      <View>
                        <Text className="text-sm font-semibold text-white">{char.name}</Text>
                        <Text className="text-xs text-gray-400">{char.character_class}</Text>
                      </View>
                    </View>
                    <View className="flex-row gap-2">
                      {char.id !== activeCharacterId && (
                        <TouchableOpacity
                          onPress={() => setActiveCharacterId(char.id)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10"
                        >
                          <Text className="text-xs text-gray-300">Activer</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleDelete(char.id)}
                        className="px-2.5 py-1 rounded-lg"
                      >
                        <Text className="text-xs text-red-400">Supprimer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </BlurView>

        {/* Add character */}
        <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden mb-4">
          <View className="p-4" style={{ backgroundColor: "rgba(8,16,10,0.55)" }}>
            <Text className="text-base font-bold text-white mb-3">Ajouter un personnage</Text>
            {error && (
              <Text className="text-red-400 text-sm mb-3">{error}</Text>
            )}
            <TextInput
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3"
              placeholder="Nom du personnage"
              placeholderTextColor="#6b7280"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-4"
              placeholder={`Classe (ex: ${DOFUS_CLASSES.slice(0, 3).join(", ")}...)`}
              placeholderTextColor="#6b7280"
              value={characterClass}
              onChangeText={setCharacterClass}
            />
            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              className="bg-dofus-green rounded-xl py-3 items-center"
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text className="text-black font-bold">Ajouter</Text>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="border border-red-500/30 rounded-xl py-3 items-center"
        >
          <Text className="text-red-400 font-semibold">Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @dofus-tracker/mobile typecheck
```

Expected: pas d'erreur TypeScript.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/profile.tsx
git commit -m "feat(mobile): add Profile tab with character CRUD and sign out"
```

---

## Task 15 — Vérification finale + CI

**Files:**
- Modify: `.github/workflows/ci.yml` (si présent)

- [ ] **Step 1: Lancer tous les tests**

```bash
pnpm --filter @dofus-tracker/ui test
```

Expected: PASS — 7 tests (3 characterStore + 3 useQuestToggle + 4 useResources passent, adjust selon le count exact).

- [ ] **Step 2: Lancer le typecheck de tous les packages**

```bash
pnpm --filter @dofus-tracker/types typecheck
pnpm --filter @dofus-tracker/db typecheck
pnpm --filter @dofus-tracker/ui typecheck
pnpm --filter @dofus-tracker/web typecheck
pnpm --filter @dofus-tracker/mobile typecheck
```

Expected: 0 erreur TypeScript pour chaque package.

- [ ] **Step 3: Vérifier le CI actuel**

```bash
cat .github/workflows/ci.yml
```

- [ ] **Step 4: Mettre à jour `.github/workflows/ci.yml` pour inclure `@dofus-tracker/ui`**

Ajouter `@dofus-tracker/ui` dans l'étape de test si elle filtre par package. Si le CI utilise `pnpm test` global, aucune modification n'est nécessaire (Turborepo le découvrira automatiquement).

Si le CI contient une liste explicite de packages à tester, ajouter :
```yaml
- run: pnpm --filter @dofus-tracker/ui test
```

- [ ] **Step 5: Commit final**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add @dofus-tracker/ui to test pipeline"
```

---

## Task 16 — Ajouter `dofustracker://auth/callback` dans Supabase

> **Note :** Cette étape est manuelle — elle se fait dans le dashboard Supabase, pas dans le code.

- [ ] **Step 1: Aller dans le dashboard Supabase**

URL : `https://supabase.com/dashboard/project/fmhfivaxlairclolwmby/auth/url-configuration`

- [ ] **Step 2: Ajouter la redirect URL**

Dans "Redirect URLs", ajouter :
```
dofustracker://auth/callback
```

- [ ] **Step 3: Créer `apps/mobile/.env.local` avec les vraies clés**

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
# Remplir EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY
```

- [ ] **Step 4: Lancer l'app en mode dev**

```bash
pnpm --filter @dofus-tracker/mobile start
```

Puis scanner le QR code avec Expo Go (Android) ou lancer `pnpm --filter @dofus-tracker/mobile android`.

- [ ] **Step 5: Commit des assets placeholder si manquants**

```bash
git add apps/mobile/
git commit -m "feat(mobile): Plan 2b complete — Expo app with auth, grille, detail, resources, profile"
```
