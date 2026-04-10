# Achievements (Succès) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un système de succès liés aux quêtes, avec progression automatique depuis les quêtes cochées et completion manuelle par objectif, sur web et mobile.

**Architecture:** 3 nouvelles tables Supabase (`achievements`, `achievement_objectives`, `achievement_objective_completions`) + script de sync idempotent depuis DofusDB JSON. La progression auto est calculée par JOIN sur `user_quest_completions` via `quest_id` nullable. La progression manuelle écrit dans `achievement_objective_completions` (ou directement dans `user_quest_completions` si l'objectif est lié à une quête).

**Tech Stack:** Next.js 14 App Router (web), Expo Router (mobile), Supabase, TypeScript, Vitest, tsx

---

## File Map

**New files:**
- `supabase/migrations/20260410000001_achievements.sql` — 3 tables + RLS
- `packages/types/src/index.ts` — add Achievement* types (modify)
- `packages/db/src/queries/achievements.ts` — 3 query functions
- `packages/db/src/index.ts` — add exports (modify)
- `packages/sync/src/sync-achievements.ts` — script de sync idempotent
- `packages/sync/src/__tests__/sync-achievements.test.ts` — unit tests normalizeQuestName
- `apps/web/app/achievements/page.tsx` — server component (auth + initial fetch)
- `apps/web/components/achievements/AchievementsClient.tsx` — client shell (sidebar + list)
- `apps/web/components/achievements/AchievementRow.tsx` — row accordéon
- `apps/web/__tests__/AchievementRow.test.tsx` — component tests
- `apps/mobile/app/(tabs)/achievements.tsx` — onglet catégories
- `apps/mobile/app/achievements/[subcategoryId].tsx` — liste des succès
- `apps/mobile/components/achievements/AchievementCard.tsx` — card FlatList
- `apps/mobile/components/achievements/AchievementBottomSheet.tsx` — détail bottom sheet

**Modified files:**
- `packages/sync/package.json` — ajouter script `sync-achievements`
- `package.json` (racine) — ajouter `sync:achievements`
- `apps/web/components/nav/Navbar.tsx` — ajouter lien "Succès"
- `apps/mobile/app/(tabs)/_layout.tsx` — ajouter onglet Succès
- `apps/mobile/lib/cache.ts` — ajouter clés de cache achievements

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260410000001_achievements.sql`

- [ ] **Step 1: Créer la migration**

```sql
-- supabase/migrations/20260410000001_achievements.sql

-- Succès importés depuis DofusDB (id entier = id DofusDB stable)
CREATE TABLE achievements (
  id               integer PRIMARY KEY,
  name             text NOT NULL,
  description      text NOT NULL,
  points           integer NOT NULL DEFAULT 0,
  level_required   integer NOT NULL DEFAULT 0,
  subcategory_id   integer NOT NULL,
  subcategory_name text NOT NULL,
  order_index      integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Objectifs de chaque succès (une quête à compléter = un objectif)
CREATE TABLE achievement_objectives (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id integer NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  order_index    integer NOT NULL DEFAULT 0,
  description    text NOT NULL,
  quest_id       uuid REFERENCES quests(id) ON DELETE SET NULL
);

CREATE INDEX ON achievement_objectives(achievement_id);
CREATE INDEX ON achievement_objectives(quest_id) WHERE quest_id IS NOT NULL;

-- Completions manuelles (objectifs cochés depuis l'UI succès sans quest_id)
CREATE TABLE achievement_objective_completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES achievement_objectives(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(character_id, objective_id)
);

CREATE INDEX ON achievement_objective_completions(character_id);

-- achievements et achievement_objectives sont en lecture publique (comme quests)
-- Writes uniquement via service role key (sync script)

-- achievement_objective_completions : scoped au user via characters
ALTER TABLE achievement_objective_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievement completions"
  ON achievement_objective_completions FOR SELECT
  USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own achievement completions"
  ON achievement_objective_completions FOR INSERT
  WITH CHECK (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own achievement completions"
  ON achievement_objective_completions FOR DELETE
  USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));
```

- [ ] **Step 2: Appliquer la migration en local**

```bash
cd /path/to/.worktrees/feat-achievements
npx supabase db push
```

Expected output: `Applying migration 20260410000001_achievements.sql...` sans erreur.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260410000001_achievements.sql
git commit -m "feat(db): add achievements, achievement_objectives, achievement_objective_completions tables"
```

---

## Task 2: Types

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Ajouter les types Achievement à la fin du fichier**

Ajouter après la dernière interface existante (`DofusDetail`) :

```typescript
// ─── Achievements ────────────────────────────────────────────────────────────

export interface Achievement {
  id: number;
  name: string;
  description: string;
  points: number;
  level_required: number;
  subcategory_id: number;
  subcategory_name: string;
  order_index: number;
}

export interface AchievementObjective {
  id: string;
  achievement_id: number;
  order_index: number;
  description: string;
  quest_id: string | null;
}

export type CompletionSource = "auto" | "manual";

export interface AchievementObjectiveWithStatus extends AchievementObjective {
  is_completed: boolean;
  completion_source: CompletionSource | null;
}

export interface AchievementWithProgress extends Achievement {
  objectives: AchievementObjectiveWithStatus[];
  completed_count: number;
  total_count: number;
}

export interface AchievementSubcategory {
  subcategory_id: number;
  subcategory_name: string;
  completed_achievements: number;
  total_achievements: number;
  earned_points: number;
}
```

- [ ] **Step 2: Rebuild le package types**

```bash
pnpm --filter @dofus-tracker/types build
```

Expected: `tsc` sans erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add Achievement, AchievementWithProgress, AchievementSubcategory types"
```

---

## Task 3: DB Queries

**Files:**
- Create: `packages/db/src/queries/achievements.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Créer `packages/db/src/queries/achievements.ts`**

```typescript
import type { SupabaseClient } from "../client.js";
import type {
  AchievementObjective,
  AchievementObjectiveWithStatus,
  AchievementSubcategory,
  AchievementWithProgress,
} from "@dofus-tracker/types";

export async function getAchievementSubcategories(
  client: SupabaseClient,
  characterId: string
): Promise<AchievementSubcategory[]> {
  const { data: achievements, error } = await client
    .from("achievements")
    .select("id, subcategory_id, subcategory_name, points, objectives:achievement_objectives(id, quest_id)");
  if (error) throw error;
  if (!achievements || achievements.length === 0) return [];

  const allObjectives = achievements.flatMap((a) => a.objectives ?? []);
  const objectiveIds = allObjectives.map((o: { id: string }) => o.id);
  const questIds = allObjectives
    .filter((o: { quest_id: string | null }) => o.quest_id)
    .map((o: { quest_id: string }) => o.quest_id);

  const [
    { data: manualCompletions, error: manualError },
    { data: questCompletions, error: questError },
  ] = await Promise.all([
    objectiveIds.length > 0
      ? client
          .from("achievement_objective_completions")
          .select("objective_id")
          .eq("character_id", characterId)
          .in("objective_id", objectiveIds)
      : Promise.resolve({ data: [], error: null }),
    questIds.length > 0
      ? client
          .from("user_quest_completions")
          .select("quest_id")
          .eq("character_id", characterId)
          .in("quest_id", questIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (manualError) throw manualError;
  if (questError) throw questError;

  const manualSet = new Set((manualCompletions ?? []).map((c: { objective_id: string }) => c.objective_id));
  const questSet = new Set((questCompletions ?? []).map((c: { quest_id: string }) => c.quest_id));

  const subcatMap = new Map<number, { name: string; completed: number; total: number; earned_points: number }>();
  for (const a of achievements) {
    const entry = subcatMap.get(a.subcategory_id) ?? {
      name: a.subcategory_name,
      completed: 0,
      total: 0,
      earned_points: 0,
    };
    entry.total++;
    const objectives = (a.objectives ?? []) as { id: string; quest_id: string | null }[];
    const allDone =
      objectives.length > 0 &&
      objectives.every((o) => (o.quest_id && questSet.has(o.quest_id)) || manualSet.has(o.id));
    if (allDone) {
      entry.completed++;
      entry.earned_points += a.points;
    }
    subcatMap.set(a.subcategory_id, entry);
  }

  return Array.from(subcatMap.entries())
    .map(([subcategory_id, { name, completed, total, earned_points }]) => ({
      subcategory_id,
      subcategory_name: name,
      completed_achievements: completed,
      total_achievements: total,
      earned_points,
    }))
    .sort((a, b) => b.total_achievements - a.total_achievements);
}

export async function getAchievementsForCharacter(
  client: SupabaseClient,
  subcategoryId: number,
  characterId: string
): Promise<AchievementWithProgress[]> {
  const { data: achievements, error: achError } = await client
    .from("achievements")
    .select("*, objectives:achievement_objectives(*)")
    .eq("subcategory_id", subcategoryId)
    .order("order_index");
  if (achError) throw achError;
  if (!achievements || achievements.length === 0) return [];

  const allObjectives = achievements.flatMap((a) => a.objectives ?? []);
  const objectiveIds = allObjectives.map((o: { id: string }) => o.id);
  const questIds = allObjectives
    .filter((o: { quest_id: string | null }) => o.quest_id)
    .map((o: { quest_id: string }) => o.quest_id);

  const [
    { data: manualCompletions, error: manualError },
    { data: questCompletions, error: questError },
  ] = await Promise.all([
    objectiveIds.length > 0
      ? client
          .from("achievement_objective_completions")
          .select("objective_id")
          .eq("character_id", characterId)
          .in("objective_id", objectiveIds)
      : Promise.resolve({ data: [], error: null }),
    questIds.length > 0
      ? client
          .from("user_quest_completions")
          .select("quest_id")
          .eq("character_id", characterId)
          .in("quest_id", questIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (manualError) throw manualError;
  if (questError) throw questError;

  const manualSet = new Set((manualCompletions ?? []).map((c: { objective_id: string }) => c.objective_id));
  const questSet = new Set((questCompletions ?? []).map((c: { quest_id: string }) => c.quest_id));

  return achievements.map((a) => {
    const objectives = ((a.objectives ?? []) as AchievementObjective[])
      .sort((x, y) => x.order_index - y.order_index)
      .map((o): AchievementObjectiveWithStatus => {
        const isAuto = o.quest_id != null && questSet.has(o.quest_id);
        const isManual = manualSet.has(o.id);
        return {
          ...o,
          is_completed: isAuto || isManual,
          completion_source: isAuto ? "auto" : isManual ? "manual" : null,
        };
      });
    return {
      id: a.id,
      name: a.name,
      description: a.description,
      points: a.points,
      level_required: a.level_required,
      subcategory_id: a.subcategory_id,
      subcategory_name: a.subcategory_name,
      order_index: a.order_index,
      objectives,
      completed_count: objectives.filter((o) => o.is_completed).length,
      total_count: objectives.length,
    };
  });
}

export async function toggleObjectiveCompletion(
  client: SupabaseClient,
  characterId: string,
  objectiveId: string,
  questId: string | null,
  completed: boolean
): Promise<void> {
  if (questId) {
    // Lié à une quête → écrire dans user_quest_completions (source de vérité unique)
    if (completed) {
      const { error } = await client
        .from("user_quest_completions")
        .insert({ character_id: characterId, quest_id: questId });
      if (error && error.code !== "23505") throw error;
    } else {
      const { error } = await client
        .from("user_quest_completions")
        .delete()
        .eq("character_id", characterId)
        .eq("quest_id", questId);
      if (error) throw error;
    }
  } else {
    // Pas de quête liée → écrire dans achievement_objective_completions
    if (completed) {
      const { error } = await client
        .from("achievement_objective_completions")
        .insert({ character_id: characterId, objective_id: objectiveId });
      if (error && error.code !== "23505") throw error;
    } else {
      const { error } = await client
        .from("achievement_objective_completions")
        .delete()
        .eq("character_id", characterId)
        .eq("objective_id", objectiveId);
      if (error) throw error;
    }
  }
}
```

- [ ] **Step 2: Ajouter les exports dans `packages/db/src/index.ts`**

Ajouter après le bloc `export { getQuestsForDofus, ... }` :

```typescript
export {
  getAchievementSubcategories,
  getAchievementsForCharacter,
  toggleObjectiveCompletion,
} from "./queries/achievements.js";
```

- [ ] **Step 3: Rebuild le package db**

```bash
pnpm --filter @dofus-tracker/db build
```

Expected: `tsc` sans erreur.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/queries/achievements.ts packages/db/src/index.ts
git commit -m "feat(db): add achievement queries (subcategories, list, toggle)"
```

---

## Task 4: Sync Script

**Files:**
- Create: `packages/sync/src/sync-achievements.ts`
- Create: `packages/sync/src/__tests__/sync-achievements.test.ts`
- Modify: `packages/sync/package.json`
- Modify: `package.json` (racine)

- [ ] **Step 1: Écrire le test unitaire `normalizeQuestName`**

```typescript
// packages/sync/src/__tests__/sync-achievements.test.ts
import { describe, it, expect } from "vitest";
import { normalizeQuestName } from "../sync-achievements.js";

describe("normalizeQuestName", () => {
  it("met en minuscules", () => {
    expect(normalizeQuestName("La Quête du Dragon")).toBe("la quête du dragon");
  });

  it("normalise les apostrophes typographiques", () => {
    expect(normalizeQuestName("L\u2019arm\u00e9e des glaces")).toBe("l'arm\u00e9e des glaces");
    expect(normalizeQuestName("L\u2018arm\u00e9e")).toBe("l'arm\u00e9e");
  });

  it("trim les espaces", () => {
    expect(normalizeQuestName("  test  ")).toBe("test");
  });

  it("collapse les espaces multiples", () => {
    expect(normalizeQuestName("la  quête  du  roi")).toBe("la quête du roi");
  });

  it("conserve les accents", () => {
    expect(normalizeQuestName("Épilogue hivernal")).toBe("épilogue hivernal");
  });
});
```

- [ ] **Step 2: Exécuter le test pour vérifier qu'il échoue**

```bash
pnpm --filter @dofus-tracker/sync test
```

Expected: FAIL — `normalizeQuestName` is not a function / module not found.

- [ ] **Step 3: Créer `packages/sync/src/sync-achievements.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Normalisation ────────────────────────────────────────────────────────────

export function normalizeQuestName(name: string): string {
  return name
    .replace(/[\u2018\u2019]/g, "'") // apostrophes typographiques → droite
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Types DofusDB ────────────────────────────────────────────────────────────

interface DofusDBObjective {
  id: number;
  description: string;
  order: number;
}

interface DofusDBAchievement {
  id: number;
  name: string;
  description: string;
  points: number;
  level_required: number;
  category_id: number;
  order: number;
  objectives: DofusDBObjective[];
  rewards: { experience: number; kamas: number; items: unknown[] };
}

interface DofusDBSubcategory {
  id: number;
  name: string;
  achievements: DofusDBAchievement[];
  count: number;
}

interface DofusDBData {
  subcategories: DofusDBSubcategory[];
  total_achievements: number;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

interface SyncReport {
  achievementsUpserted: number;
  objectivesUpserted: number;
  objectivesMatched: number;
  objectivesUnmatched: number;
  errors: string[];
}

export async function syncAchievements(
  client: ReturnType<typeof createClient>,
  data: DofusDBData
): Promise<SyncReport> {
  const report: SyncReport = {
    achievementsUpserted: 0,
    objectivesUpserted: 0,
    objectivesMatched: 0,
    objectivesUnmatched: 0,
    errors: [],
  };

  // 1. Charger tous les noms de quêtes existants en DB pour le matching
  const { data: questRows, error: questError } = await client
    .from("quests")
    .select("id, name");
  if (questError) {
    report.errors.push(`Failed to fetch quests: ${questError.message}`);
    return report;
  }

  const questNameMap = new Map<string, string>(); // normalizedName → quest uuid
  for (const q of questRows ?? []) {
    questNameMap.set(normalizeQuestName(q.name), q.id);
  }

  // 2. Traiter chaque sous-catégorie
  for (const subcat of data.subcategories) {
    if (!subcat.achievements || subcat.achievements.length === 0) continue;

    // Upsert achievements
    const achievementRows = subcat.achievements.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      points: a.points,
      level_required: a.level_required,
      subcategory_id: subcat.id,
      subcategory_name: subcat.name,
      order_index: a.order,
    }));

    const { error: achError } = await client
      .from("achievements")
      .upsert(achievementRows, { onConflict: "id" });

    if (achError) {
      report.errors.push(`Achievement upsert failed for subcat ${subcat.name}: ${achError.message}`);
      continue;
    }
    report.achievementsUpserted += achievementRows.length;

    // Upsert objectives pour chaque achievement
    for (const a of subcat.achievements) {
      if (!a.objectives || a.objectives.length === 0) continue;

      // Récupérer les quest_id déjà matchés pour ne pas les écraser
      const { data: existing } = await client
        .from("achievement_objectives")
        .select("id, description, quest_id")
        .eq("achievement_id", a.id);

      const existingMap = new Map<string, { id: string; quest_id: string | null }>();
      for (const e of existing ?? []) {
        existingMap.set(normalizeQuestName(e.description), { id: e.id, quest_id: e.quest_id });
      }

      const objectiveRows = a.objectives.map((o) => {
        const normalizedDesc = normalizeQuestName(o.description);
        const existingEntry = existingMap.get(normalizedDesc);
        // Préserver un quest_id déjà matchés
        const resolvedQuestId =
          existingEntry?.quest_id ?? questNameMap.get(normalizedDesc) ?? null;

        if (resolvedQuestId) {
          report.objectivesMatched++;
        } else {
          report.objectivesUnmatched++;
        }

        return {
          ...(existingEntry?.id ? { id: existingEntry.id } : {}),
          achievement_id: a.id,
          order_index: o.order,
          description: o.description,
          quest_id: resolvedQuestId,
        };
      });

      const { error: objError } = await client
        .from("achievement_objectives")
        .upsert(objectiveRows, { onConflict: "id", ignoreDuplicates: false });

      if (objError) {
        report.errors.push(`Objectives upsert failed for achievement ${a.id}: ${objError.message}`);
      } else {
        report.objectivesUpserted += objectiveRows.length;
      }
    }
  }

  return report;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error("Usage: tsx src/sync-achievements.ts <path/to/dofusdb_quetes.json>");
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  const data: DofusDBData = JSON.parse(readFileSync(resolve(jsonPath), "utf-8"));

  console.log(`📦 Syncing ${data.total_achievements} achievements...`);
  const report = await syncAchievements(client, data);

  console.log(`\n✅ Done:`);
  console.log(`   ${report.achievementsUpserted} achievements upserted`);
  console.log(`   ${report.objectivesUpserted} objectives upserted`);
  console.log(`   ${report.objectivesMatched} objectives matched to quests`);
  console.log(`   ${report.objectivesUnmatched} objectives unmatched (manual only)`);

  if (report.errors.length > 0) {
    console.error(`\n❌ ${report.errors.length} error(s):`);
    report.errors.forEach((e) => console.error("  -", e));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
```

- [ ] **Step 4: Exécuter les tests pour vérifier qu'ils passent**

```bash
pnpm --filter @dofus-tracker/sync test
```

Expected: 5 tests passing.

- [ ] **Step 5: Ajouter le script dans `packages/sync/package.json`**

Dans `"scripts"`, ajouter après `"start"` :

```json
"sync-achievements": "tsx --env-file=../../.env src/sync-achievements.ts",
```

- [ ] **Step 6: Ajouter le script dans `package.json` racine**

Dans `"scripts"`, ajouter après `"sync"` :

```json
"sync:achievements": "pnpm --filter @dofus-tracker/sync run sync-achievements",
```

- [ ] **Step 7: Exécuter le sync avec le fichier JSON**

```bash
pnpm sync:achievements -- /Users/juliani/Downloads/dofusdb_quetes.json
```

Expected :
```
📦 Syncing 291 achievements...
✅ Done:
   291 achievements upserted
   ~1500 objectives upserted
   X objectives matched to quests
   Y objectives unmatched (manual only)
```

- [ ] **Step 8: Commit**

```bash
git add packages/sync/src/sync-achievements.ts \
        packages/sync/src/__tests__/sync-achievements.test.ts \
        packages/sync/package.json \
        package.json
git commit -m "feat(sync): add sync-achievements script with quest name matching"
```

---

## Task 5: Web — AchievementRow component

**Files:**
- Create: `apps/web/components/achievements/AchievementRow.tsx`
- Create: `apps/web/__tests__/AchievementRow.test.tsx`

- [ ] **Step 1: Écrire le test**

```typescript
// apps/web/__tests__/AchievementRow.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { AchievementWithProgress } from "@dofus-tracker/types";

const baseAchievement: AchievementWithProgress = {
  id: 568,
  name: "Les mystères de Frigost",
  description: "Terminer les quêtes suivantes.",
  points: 30,
  level_required: 0,
  subcategory_id: 51,
  subcategory_name: "Île de Frigost",
  order_index: 0,
  completed_count: 3,
  total_count: 5,
  objectives: [
    { id: "obj-1", achievement_id: 568, order_index: 0, description: "Œuf à la neige", quest_id: "q1", is_completed: true, completion_source: "auto" },
    { id: "obj-2", achievement_id: 568, order_index: 1, description: "L'ère glaciaire", quest_id: "q2", is_completed: true, completion_source: "manual" },
    { id: "obj-3", achievement_id: 568, order_index: 2, description: "Commission impossible", quest_id: null, is_completed: true, completion_source: "manual" },
    { id: "obj-4", achievement_id: 568, order_index: 3, description: "Épilogue hivernal", quest_id: null, is_completed: false, completion_source: null },
    { id: "obj-5", achievement_id: 568, order_index: 4, description: "Objectif lié non fait", quest_id: "q5", is_completed: false, completion_source: null },
  ],
};

const { AchievementRow } = await import("@/components/achievements/AchievementRow");

describe("AchievementRow", () => {
  it("affiche le nom et la description", () => {
    render(<AchievementRow achievement={baseAchievement} onToggleObjective={vi.fn()} />);
    expect(screen.getByText("Les mystères de Frigost")).toBeInTheDocument();
    expect(screen.getByText("Terminer les quêtes suivantes.")).toBeInTheDocument();
  });

  it("affiche le badge X/N objectifs", () => {
    render(<AchievementRow achievement={baseAchievement} onToggleObjective={vi.fn()} />);
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("affiche le badge de points", () => {
    render(<AchievementRow achievement={baseAchievement} onToggleObjective={vi.fn()} />);
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("déplie les objectifs au clic sur la row", () => {
    render(<AchievementRow achievement={baseAchievement} onToggleObjective={vi.fn()} />);
    expect(screen.queryByText("Œuf à la neige")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Les mystères de Frigost/i }));
    expect(screen.getByText("Œuf à la neige")).toBeInTheDocument();
  });

  it("appelle onToggleObjective pour un objectif sans quest_id non complété", () => {
    const onToggle = vi.fn();
    render(<AchievementRow achievement={baseAchievement} onToggleObjective={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /Les mystères de Frigost/i }));
    fireEvent.click(screen.getByLabelText("Épilogue hivernal"));
    expect(onToggle).toHaveBeenCalledWith("obj-4", null, true);
  });

  it("appelle onToggleObjective pour un objectif avec quest_id non complété", () => {
    const onToggle = vi.fn();
    render(<AchievementRow achievement={baseAchievement} onToggleObjective={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /Les mystères de Frigost/i }));
    fireEvent.click(screen.getByLabelText("Objectif lié non fait"));
    expect(onToggle).toHaveBeenCalledWith("obj-5", "q5", true);
  });

  it("ne déclenche pas onToggleObjective pour un objectif auto", () => {
    const onToggle = vi.fn();
    render(<AchievementRow achievement={baseAchievement} onToggleObjective={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /Les mystères de Frigost/i }));
    fireEvent.click(screen.getByLabelText("Œuf à la neige"));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Exécuter le test pour vérifier qu'il échoue**

```bash
pnpm --filter @dofus-tracker/web exec vitest run __tests__/AchievementRow.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Créer `apps/web/components/achievements/AchievementRow.tsx`**

```typescript
"use client";

import { useState } from "react";
import type { AchievementWithProgress, AchievementObjectiveWithStatus } from "@dofus-tracker/types";

interface Props {
  achievement: AchievementWithProgress;
  onToggleObjective: (objectiveId: string, questId: string | null, completed: boolean) => void;
}

function statusColor(completed_count: number, total_count: number): string {
  if (total_count === 0) return "bg-gray-700";
  if (completed_count === total_count) return "bg-green-500";
  if (completed_count > 0) return "bg-yellow-500";
  return "bg-gray-600";
}

function ObjectiveCheckbox({ obj, onToggle }: {
  obj: AchievementObjectiveWithStatus;
  onToggle: (objectiveId: string, questId: string | null, completed: boolean) => void;
}) {
  const isAuto = obj.completion_source === "auto";
  const isClickable = !isAuto;

  return (
    <label
      aria-label={obj.description}
      className={`flex items-center gap-2 py-1.5 text-sm ${isClickable ? "cursor-pointer" : "cursor-default"}`}
    >
      <input
        type="checkbox"
        checked={obj.is_completed}
        disabled={!isClickable}
        onChange={isClickable ? () => onToggle(obj.id, obj.quest_id, !obj.is_completed) : undefined}
        className="hidden"
      />
      <span
        className={`w-4 h-4 rounded flex items-center justify-center border text-xs flex-shrink-0
          ${obj.is_completed && isAuto ? "bg-blue-900 border-blue-500 text-blue-400" : ""}
          ${obj.is_completed && !isAuto ? "bg-green-900 border-green-500 text-green-400" : ""}
          ${!obj.is_completed ? "border-gray-600" : ""}
        `}
      >
        {obj.is_completed ? "✓" : ""}
      </span>
      <span className={obj.is_completed ? "line-through text-gray-500" : "text-gray-200"}>
        {obj.description}
      </span>
      {isAuto && (
        <span className="ml-auto text-xs text-blue-500 italic">auto</span>
      )}
    </label>
  );
}

export function AchievementRow({ achievement, onToggleObjective }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { completed_count, total_count } = achievement;
  const isFullyDone = total_count > 0 && completed_count === total_count;

  return (
    <div className={`rounded-lg border mb-2 overflow-hidden
      ${isFullyDone ? "border-green-800" : "border-gray-700"}
    `}>
      {/* Header row */}
      <button
        role="button"
        aria-label={achievement.name}
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
      >
        {/* Left color bar */}
        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${statusColor(completed_count, total_count)}`} />

        {/* Icon placeholder */}
        <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">
          🏆
        </div>

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-100 truncate">{achievement.name}</p>
          <p className="text-xs text-gray-400 truncate">{achievement.description}</p>
        </div>

        {/* Progress + points */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs ${isFullyDone ? "text-green-400" : completed_count > 0 ? "text-yellow-400" : "text-gray-500"}`}>
            {completed_count}/{total_count}
          </span>
          <span className={`text-sm font-bold px-2 py-0.5 rounded
            ${isFullyDone ? "bg-green-900 text-green-300" : "bg-gray-800 text-yellow-400"}
          `}>
            {achievement.points}
          </span>
        </div>
      </button>

      {/* Detail panel */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-gray-900/50 border-t border-gray-700/50">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Objectifs</p>
          <div className="pl-2">
            {achievement.objectives.map((obj) => (
              <ObjectiveCheckbox key={obj.id} obj={obj} onToggle={onToggleObjective} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Exécuter les tests**

```bash
pnpm --filter @dofus-tracker/web exec vitest run __tests__/AchievementRow.test.tsx
```

Expected: 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/achievements/AchievementRow.tsx \
        apps/web/__tests__/AchievementRow.test.tsx
git commit -m "feat(web): add AchievementRow component with accordion and objective checkboxes"
```

---

## Task 6: Web — Page Achievements + Navbar

**Files:**
- Create: `apps/web/app/achievements/page.tsx`
- Create: `apps/web/components/achievements/AchievementsClient.tsx`
- Modify: `apps/web/components/nav/Navbar.tsx`

- [ ] **Step 1: Créer `apps/web/app/achievements/page.tsx`**

```typescript
import { createClient } from "@/lib/supabase/server";
import {
  getAchievementSubcategories,
  getAchievementsForCharacter,
  getCharacters,
} from "@dofus-tracker/db";
import { AchievementsClient } from "@/components/achievements/AchievementsClient";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ cat?: string }>;
}

export default async function AchievementsPage({ searchParams }: Props) {
  const { cat } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const characters = await getCharacters(supabase, user.id);
  if (characters.length === 0) redirect("/profile");

  const defaultCharacterId = characters[0].id;

  const subcategories = await getAchievementSubcategories(supabase, defaultCharacterId);

  const initialCatId = cat ? parseInt(cat, 10) : (subcategories[0]?.subcategory_id ?? null);
  const initialAchievements = initialCatId
    ? await getAchievementsForCharacter(supabase, initialCatId, defaultCharacterId)
    : [];

  return (
    <AchievementsClient
      subcategories={subcategories}
      initialAchievements={initialAchievements}
      initialCatId={initialCatId}
    />
  );
}
```

- [ ] **Step 2: Créer `apps/web/components/achievements/AchievementsClient.tsx`**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { useSupabase } from "@/app/providers";
import {
  getAchievementSubcategories,
  getAchievementsForCharacter,
  toggleObjectiveCompletion,
} from "@dofus-tracker/db";
import { AchievementRow } from "./AchievementRow";
import type { AchievementSubcategory, AchievementWithProgress } from "@dofus-tracker/types";

interface Props {
  subcategories: AchievementSubcategory[];
  initialAchievements: AchievementWithProgress[];
  initialCatId: number | null;
}

export function AchievementsClient({ subcategories: initialSubcats, initialAchievements, initialCatId }: Props) {
  const supabase = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);

  const [subcategories, setSubcategories] = useState<AchievementSubcategory[]>(initialSubcats);
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>(initialAchievements);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(initialCatId);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Recharger les sous-catégories et les succès quand le personnage actif change
  useEffect(() => {
    if (!activeCharacterId) return;
    Promise.all([
      getAchievementSubcategories(supabase, activeCharacterId),
      selectedCatId
        ? getAchievementsForCharacter(supabase, selectedCatId, activeCharacterId)
        : Promise.resolve([]),
    ]).then(([subcats, achs]) => {
      setSubcategories(subcats);
      setAchievements(achs);
    });
  }, [activeCharacterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Charger les succès quand la catégorie sélectionnée change
  useEffect(() => {
    if (!selectedCatId || !activeCharacterId) return;
    setLoading(true);
    getAchievementsForCharacter(supabase, selectedCatId, activeCharacterId)
      .then(setAchievements)
      .catch(console.error)
      .finally(() => setLoading(false));
    const params = new URLSearchParams(searchParams.toString());
    params.set("cat", String(selectedCatId));
    router.replace(`/achievements?${params.toString()}`, { scroll: false });
  }, [selectedCatId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggleObjective(objectiveId: string, questId: string | null, completed: boolean) {
    if (!activeCharacterId) return;
    // Optimistic update
    setAchievements((prev) =>
      prev.map((a) => ({
        ...a,
        objectives: a.objectives.map((o) =>
          o.id === objectiveId
            ? {
                ...o,
                is_completed: completed,
                completion_source: completed
                  ? questId
                    ? ("auto" as const)
                    : ("manual" as const)
                  : null,
              }
            : o
        ),
        completed_count: a.objectives.filter((o) =>
          o.id === objectiveId ? completed : o.is_completed
        ).length,
      }))
    );
    try {
      await toggleObjectiveCompletion(supabase, activeCharacterId, objectiveId, questId, completed);
      // Recharger les sous-catégories pour mettre à jour les compteurs sidebar
      const updatedSubcats = await getAchievementSubcategories(supabase, activeCharacterId);
      setSubcategories(updatedSubcats);
    } catch (err) {
      console.error(err);
      // Rollback
      setAchievements((prev) =>
        prev.map((a) => ({
          ...a,
          objectives: a.objectives.map((o) =>
            o.id === objectiveId ? { ...o, is_completed: !completed, completion_source: !completed ? (questId ? ("auto" as const) : ("manual" as const)) : null } : o
          ),
          completed_count: a.objectives.filter((o) =>
            o.id === objectiveId ? !completed : o.is_completed
          ).length,
        }))
      );
    }
  }

  const totalEarnedPoints = subcategories.reduce((sum, s) => sum + s.earned_points, 0);

  const filteredAchievements = search
    ? achievements.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : achievements;

  return (
    <main className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3">
        <h1 className="text-xl font-bold text-yellow-400">🏆 Succès</h1>
        <span className="text-sm text-amber-700 bg-amber-950 px-3 py-0.5 rounded-full font-semibold">
          ⭐ {totalEarnedPoints} pts gagnés
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-white/5 overflow-y-auto py-3">
          {subcategories.map((sub) => (
            <button
              key={sub.subcategory_id}
              onClick={() => setSelectedCatId(sub.subcategory_id)}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left border-l-2 transition-colors
                ${selectedCatId === sub.subcategory_id
                  ? "text-yellow-400 bg-yellow-950/30 border-yellow-500"
                  : "text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5"}
              `}
            >
              <span className="truncate">{sub.subcategory_name}</span>
              <span className={`text-xs ml-2 flex-shrink-0 px-1.5 rounded
                ${selectedCatId === sub.subcategory_id ? "bg-amber-900 text-amber-300" : "bg-gray-800 text-gray-500"}
              `}>
                {sub.completed_achievements}/{sub.total_achievements}
              </span>
            </button>
          ))}
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="px-4 py-2 border-b border-white/5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍  Rechercher un succès…"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-600"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {loading ? (
              <p className="text-gray-500 text-sm">Chargement…</p>
            ) : filteredAchievements.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucun succès trouvé.</p>
            ) : (
              filteredAchievements.map((a) => (
                <AchievementRow
                  key={a.id}
                  achievement={a}
                  onToggleObjective={handleToggleObjective}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Ajouter le lien "Succès" dans `apps/web/components/nav/Navbar.tsx`**

Localiser la ligne avec le lien "Personnages" :
```typescript
<Link href="/characters" className="text-sm text-gray-400 hover:text-white transition-colors">
  Personnages
</Link>
```

Ajouter avant ce lien :
```typescript
<Link href="/achievements" className="text-sm text-gray-400 hover:text-white transition-colors">
  🏆 Succès
</Link>
```

- [ ] **Step 4: Vérifier que la page compile**

```bash
pnpm --filter @dofus-tracker/web build 2>&1 | tail -20
```

Expected: build success ou uniquement des warnings, pas d'erreur TypeScript.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/achievements/page.tsx \
        apps/web/components/achievements/AchievementsClient.tsx \
        apps/web/components/nav/Navbar.tsx
git commit -m "feat(web): add /achievements page with sidebar, list, and inline expand"
```

---

## Task 7: Mobile — Onglet Catégories

**Files:**
- Modify: `apps/mobile/lib/cache.ts`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/achievements.tsx`
- Create: `apps/mobile/components/achievements/AchievementCard.tsx`

- [ ] **Step 1: Ajouter les clés de cache dans `apps/mobile/lib/cache.ts`**

Dans l'objet `CACHE_KEYS`, ajouter :
```typescript
achievementSubcategories: (characterId: string) => `cache:achievements:subcategories:${characterId}`,
achievements: (subcategoryId: number, characterId: string) => `cache:achievements:${subcategoryId}:${characterId}`,
```

- [ ] **Step 2: Ajouter l'onglet dans `apps/mobile/app/(tabs)/_layout.tsx`**

Après le `<Tabs.Screen name="resources" ...>`, ajouter :

```tsx
<Tabs.Screen
  name="achievements"
  options={{
    title: "Succès",
    tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏆</Text>,
  }}
/>
```

- [ ] **Step 3: Créer `apps/mobile/components/achievements/AchievementCard.tsx`**

```typescript
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { AchievementSubcategory } from "@dofus-tracker/types";

interface Props {
  subcategory: AchievementSubcategory;
  onPress: () => void;
}

export function AchievementSubcategoryCard({ subcategory, onPress }: Props) {
  const progress =
    subcategory.total_achievements > 0
      ? subcategory.completed_achievements / subcategory.total_achievements
      : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {subcategory.subcategory_name}
        </Text>
        <View style={styles.progressWrap}>
          <View style={[styles.progressBar, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.count}>
          {subcategory.completed_achievements}/{subcategory.total_achievements}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  info: { flex: 1, marginRight: 12 },
  name: { color: "#e2e8f0", fontSize: 14, marginBottom: 4 },
  progressWrap: {
    height: 3,
    backgroundColor: "#1e293b",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#f59e0b",
    borderRadius: 2,
  },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  count: {
    fontSize: 12,
    color: "#64748b",
    backgroundColor: "#1e293b",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  chevron: { color: "#475569", fontSize: 16 },
});
```

- [ ] **Step 4: Créer `apps/mobile/app/(tabs)/achievements.tsx`**

```typescript
import { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { getAchievementSubcategories } from "@dofus-tracker/db";
import { AchievementSubcategoryCard } from "@/components/achievements/AchievementCard";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";
import type { AchievementSubcategory } from "@dofus-tracker/types";

const TTL_5MIN = 1000 * 60 * 5;

export default function AchievementsScreen() {
  const router = useRouter();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const [subcategories, setSubcategories] = useState<AchievementSubcategory[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!activeCharacterId) return;

      async function load() {
        const cacheKey = CACHE_KEYS.achievementSubcategories(activeCharacterId!);
        const cached = await readCache<AchievementSubcategory[]>(cacheKey, TTL_5MIN);
        if (cached) {
          setSubcategories(cached);
          setLoading(false);
          return;
        }
        try {
          const data = await getAchievementSubcategories(supabase, activeCharacterId!);
          setSubcategories(data);
          await writeCache(cacheKey, data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }

      load();
    }, [activeCharacterId])
  );

  const totalPoints = subcategories.reduce((s, c) => s + c.earned_points, 0);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Succès" }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Succès</Text>
        <Text style={styles.headerPoints}>⭐ {totalPoints} pts</Text>
      </View>

      {loading ? (
        <Text style={styles.loading}>Chargement…</Text>
      ) : (
        <FlatList
          data={subcategories}
          keyExtractor={(item) => String(item.subcategory_id)}
          renderItem={({ item }) => (
            <AchievementSubcategoryCard
              subcategory={item}
              onPress={() =>
                router.push(
                  `/achievements/${item.subcategory_id}?name=${encodeURIComponent(item.subcategory_name)}`
                )
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080e0a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: { color: "#f59e0b", fontSize: 18, fontWeight: "700" },
  headerPoints: {
    color: "#92400e",
    backgroundColor: "#451a03",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 13,
    fontWeight: "700",
  },
  loading: { color: "#64748b", textAlign: "center", marginTop: 40 },
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/cache.ts \
        apps/mobile/app/(tabs)/_layout.tsx \
        apps/mobile/app/(tabs)/achievements.tsx \
        apps/mobile/components/achievements/AchievementCard.tsx
git commit -m "feat(mobile): add achievements tab with subcategory list"
```

---

## Task 8: Mobile — Liste des succès + Bottom Sheet

**Files:**
- Create: `apps/mobile/app/achievements/[subcategoryId].tsx`
- Create: `apps/mobile/components/achievements/AchievementBottomSheet.tsx`

- [ ] **Step 1: Créer `apps/mobile/components/achievements/AchievementBottomSheet.tsx`**

```typescript
import { forwardRef, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import {
  CustomBottomSheet,
  BottomSheetView,
  type BottomSheetHandle,
} from "@/components/shared/CustomBottomSheet";
import type { AchievementWithProgress, AchievementObjectiveWithStatus } from "@dofus-tracker/types";

interface Props {
  achievement: AchievementWithProgress | null;
  onToggleObjective: (objectiveId: string, questId: string | null, completed: boolean) => void;
}

export interface AchievementBottomSheetHandle {
  expand: () => void;
  close: () => void;
}

function ObjectiveRow({ obj, onToggle }: {
  obj: AchievementObjectiveWithStatus;
  onToggle: (objectiveId: string, questId: string | null, completed: boolean) => void;
}) {
  const isAuto = obj.completion_source === "auto";

  return (
    <TouchableOpacity
      style={styles.objective}
      onPress={isAuto ? undefined : () => onToggle(obj.id, obj.quest_id, !obj.is_completed)}
      activeOpacity={isAuto ? 1 : 0.6}
      disabled={isAuto}
    >
      <View style={[
        styles.checkbox,
        obj.is_completed && isAuto && styles.checkboxAuto,
        obj.is_completed && !isAuto && styles.checkboxManual,
      ]}>
        {obj.is_completed && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.objText, obj.is_completed && styles.objTextDone]} numberOfLines={2}>
        {obj.description}
      </Text>
      {isAuto && <Text style={styles.autoLabel}>auto</Text>}
    </TouchableOpacity>
  );
}

export const AchievementBottomSheet = forwardRef<AchievementBottomSheetHandle, Props>(
  function AchievementBottomSheet({ achievement, onToggleObjective }, ref) {
    const sheetRef = useRef<BottomSheetHandle>(null);

    // Expose expand/close via ref
    if (ref) {
      (ref as React.MutableRefObject<AchievementBottomSheetHandle>).current = {
        expand: () => sheetRef.current?.expand(),
        close: () => sheetRef.current?.close(),
      };
    }

    return (
      <CustomBottomSheet
        ref={sheetRef}
        snapPoints={["70%"]}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#0d1f12" }}
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.2)" }}
      >
        <BottomSheetView>
          {achievement && (
            <ScrollView contentContainerStyle={styles.content}>
              {/* Header */}
              <View style={styles.achHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.achName}>{achievement.name}</Text>
                  <Text style={styles.achDesc}>{achievement.description}</Text>
                </View>
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsText}>{achievement.points}</Text>
                </View>
              </View>

              {/* Objectifs */}
              <Text style={styles.sectionLabel}>Objectifs</Text>
              {achievement.objectives.map((obj) => (
                <ObjectiveRow key={obj.id} obj={obj} onToggle={onToggleObjective} />
              ))}

              {/* Récompenses — à étendre dans une tâche future si ajout du champ rewards dans AchievementWithProgress */}
            </ScrollView>
          )}
        </BottomSheetView>
      </CustomBottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  content: { padding: 16 },
  achHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  achName: { color: "#e2e8f0", fontSize: 16, fontWeight: "700", marginBottom: 2 },
  achDesc: { color: "#64748b", fontSize: 12 },
  pointsBadge: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pointsText: { color: "#f59e0b", fontWeight: "700", fontSize: 14 },
  sectionLabel: {
    color: "#475569",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  objective: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: "#475569",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxAuto: { backgroundColor: "#1e3a5f", borderColor: "#3b82f6" },
  checkboxManual: { backgroundColor: "#14532d", borderColor: "#22c55e" },
  checkmark: { color: "#fff", fontSize: 10, fontWeight: "700" },
  objText: { flex: 1, color: "#cbd5e1", fontSize: 13 },
  objTextDone: { color: "#475569", textDecorationLine: "line-through" },
  autoLabel: { color: "#3b82f6", fontSize: 10, fontStyle: "italic", flexShrink: 0 },
});
```

- [ ] **Step 2: Créer `apps/mobile/app/achievements/[subcategoryId].tsx`**

```typescript
import { useState, useCallback, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  getAchievementsForCharacter,
  getAchievementSubcategories,
  toggleObjectiveCompletion,
} from "@dofus-tracker/db";
import {
  AchievementBottomSheet,
  type AchievementBottomSheetHandle,
} from "@/components/achievements/AchievementBottomSheet";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";
import type { AchievementWithProgress } from "@dofus-tracker/types";

const TTL_5MIN = 1000 * 60 * 5;

function statusColor(completed: number, total: number) {
  if (total === 0) return "#334155";
  if (completed === total) return "#22c55e";
  if (completed > 0) return "#f59e0b";
  return "#334155";
}

export default function AchievementListScreen() {
  const { subcategoryId, name } = useLocalSearchParams<{ subcategoryId: string; name: string }>();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithProgress | null>(null);
  const bottomSheetRef = useRef<AchievementBottomSheetHandle>(null);

  useFocusEffect(
    useCallback(() => {
      if (!activeCharacterId || !subcategoryId) return;
      const catId = parseInt(subcategoryId, 10);
      const cacheKey = CACHE_KEYS.achievements(catId, activeCharacterId);

      async function load() {
        const cached = await readCache<AchievementWithProgress[]>(cacheKey, TTL_5MIN);
        if (cached) {
          setAchievements(cached);
          setLoading(false);
          return;
        }
        try {
          const data = await getAchievementsForCharacter(supabase, catId, activeCharacterId!);
          setAchievements(data);
          await writeCache(cacheKey, data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }

      load();
    }, [activeCharacterId, subcategoryId])
  );

  async function handleToggleObjective(objectiveId: string, questId: string | null, completed: boolean) {
    if (!activeCharacterId) return;
    // Optimistic update
    const updateAchs = (prev: AchievementWithProgress[]) =>
      prev.map((a) => ({
        ...a,
        objectives: a.objectives.map((o) =>
          o.id === objectiveId
            ? { ...o, is_completed: completed, completion_source: completed ? (questId ? ("auto" as const) : ("manual" as const)) : null }
            : o
        ),
        completed_count: a.objectives.filter((o) => (o.id === objectiveId ? completed : o.is_completed)).length,
      }));

    setAchievements(updateAchs);
    setSelectedAchievement((prev) => prev ? updateAchs([prev])[0] : null);

    try {
      await toggleObjectiveCompletion(supabase, activeCharacterId, objectiveId, questId, completed);
      // Invalider le cache
      const catId = parseInt(subcategoryId, 10);
      await writeCache(CACHE_KEYS.achievements(catId, activeCharacterId), achievements);
      // Invalider le cache des sous-catégories
      const subcats = await getAchievementSubcategories(supabase, activeCharacterId);
      await writeCache(CACHE_KEYS.achievementSubcategories(activeCharacterId), subcats);
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = search
    ? achievements.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : achievements;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: decodeURIComponent(name ?? "Succès") }} />

      {/* Barre de recherche */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher…"
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <Text style={styles.loading}>Chargement…</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                setSelectedAchievement(item);
                bottomSheetRef.current?.expand();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.colorBar, { backgroundColor: statusColor(item.completed_count, item.total_count) }]} />
              <View style={styles.rowIcon}>
                <Text style={{ fontSize: 16 }}>🏆</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                <Text style={[
                  styles.rowProgress,
                  item.completed_count === item.total_count ? styles.progressDone : item.completed_count > 0 ? styles.progressPartial : styles.progressTodo
                ]}>
                  {item.completed_count}/{item.total_count} objectifs
                </Text>
              </View>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsText}>{item.points}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <AchievementBottomSheet
        ref={bottomSheetRef}
        achievement={selectedAchievement}
        onToggleObjective={handleToggleObjective}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080e0a" },
  searchWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  searchInput: {
    backgroundColor: "#1e1e35",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#e2e8f0",
    fontSize: 14,
  },
  loading: { color: "#64748b", textAlign: "center", marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
    gap: 10,
  },
  colorBar: { width: 3, alignSelf: "stretch", borderRadius: 2 },
  rowIcon: {
    width: 32,
    height: 32,
    backgroundColor: "#1e1e35",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { color: "#e2e8f0", fontSize: 13, fontWeight: "600", marginBottom: 2 },
  rowProgress: { fontSize: 11 },
  progressDone: { color: "#22c55e" },
  progressPartial: { color: "#f59e0b" },
  progressTodo: { color: "#475569" },
  pointsBadge: { backgroundColor: "#1e293b", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pointsText: { color: "#f59e0b", fontWeight: "700", fontSize: 12 },
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/achievements/[subcategoryId].tsx \
        apps/mobile/components/achievements/AchievementBottomSheet.tsx
git commit -m "feat(mobile): add achievement list screen and detail bottom sheet"
```

---

## Vérification finale

- [ ] **Tous les tests passent**

```bash
pnpm --filter @dofus-tracker/web exec vitest run
pnpm --filter @dofus-tracker/sync test
```

Expected: 37+6 web tests passing, 5 sync tests passing.

- [ ] **Le sync tourne sans erreur**

```bash
pnpm sync:achievements -- /Users/juliani/Downloads/dofusdb_quetes.json
```

- [ ] **Commit de fin de feature (si tout est vert)**

```bash
git log --oneline -10
```

Vérifier que les 8 commits de feature sont présents sur la branche `feat/achievements`.
