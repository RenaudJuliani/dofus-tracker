# Quest Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter les ressources par quête (depuis le Apps Script Google Sheets) et les afficher dans le web et l'app mobile — panneau expandable sous chaque quête + vue globale agrégée par Dofus.

**Architecture:** Nouvelle table `quest_resources(id, quest_id, name, quantity, is_kamas)` remplace la table `resources`. Le sync chaîne deux étapes : Sheets API (quêtes + ordre) puis Apps Script JSON (ressources par quête). `getQuestsForDofus` charge les ressources en parallèle et les attache à chaque `QuestWithChain`. L'agrégation globale est calculée côté client dans le screen/client component. Tasks 7-9 (mobile) et 10-12 (web) sont des **petits diffs** sur du code existant, pas des réécritures.

**Tech Stack:** Supabase migrations, TypeScript 5.4, tsx, vitest 1.6, Next.js 14, Expo/React Native, Tailwind

---

## File Map

```
supabase/migrations/
  20240404000001_quest_resources.sql   ← CREATE quest_resources, DROP resources, RLS

packages/types/src/
  index.ts                             ← +QuestResource, +AggregatedResource, -Resource, update QuestWithChain

packages/db/src/
  queries/quests.ts                    ← getQuestsForDofus fetches quest_resources en parallèle
  queries/resources.ts                 ← SUPPRIMÉ (plus de table resources)
  index.ts                             ← retire export getResourcesForDofus

packages/ui/src/
  hooks/useResources.ts                ← Resource[] → AggregatedResource[], quantity_per_character → quantity

packages/sync/src/
  apps-script-client.ts                ← NOUVEAU fetch + parse JSON Apps Script
  sync-apps-script-upsert.ts           ← NOUVEAU upsert quest_resources par slug match
  upsert.ts                            ← retire parseResourceRows + resources delete/insert
  index.ts                             ← chaîne sheets sync → apps script sync, lit APPS_SCRIPT_URL
  parsers/resource-parser.ts           ← SUPPRIMÉ
  __tests__/apps-script-client.test.ts ← NOUVEAU tests extractAllQuests
  __tests__/resource-parser.test.ts    ← SUPPRIMÉ

.env.example                           ← +APPS_SCRIPT_URL

apps/mobile/app/dofus/[slug].tsx       ← retire getResourcesForDofus, calcule aggregatedResources depuis quests
apps/mobile/components/dofus/
  QuestItem.tsx                        ← +25 lignes : expandable resources
  ResourceSection.tsx                  ← Resource[] → AggregatedResource[] (3 lignes)
apps/mobile/components/resources/
  ResourceBottomSheet.tsx              ← Resource[] → AggregatedResource[], retire icon_emoji (diff mineur)

apps/web/components/dofus/
  DofusDetailClient.tsx                ← retire getResourcesForDofus, calcule aggregatedResources depuis quests
  ResourcePanel.tsx                    ← Resource[] → AggregatedResource[], retire icon_emoji
  QuestItem.tsx                        ← +25 lignes : expandable resources (même logique que mobile)
```

---

## Task 1: Migration — quest_resources

**Files:**
- Create: `supabase/migrations/20240404000001_quest_resources.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Create quest_resources: ressources par quête (source: Apps Script JSON)
CREATE TABLE quest_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  is_kamas boolean NOT NULL DEFAULT false
);

CREATE INDEX ON quest_resources(quest_id);

-- RLS: lecture publique, écriture service role uniquement (same pattern as dofus, quests)
ALTER TABLE quest_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quest resources are publicly readable" ON quest_resources
  FOR SELECT USING (true);

-- Drop old resources table (données migrées via sync)
DROP TABLE IF EXISTS resources;
```

- [ ] **Step 2: Appliquer la migration**

```bash
supabase db push
```

Expected output: migration applied, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20240404000001_quest_resources.sql
git commit -m "feat(db): add quest_resources table, drop resources"
```

---

## Task 2: Types — QuestResource + AggregatedResource

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Mettre à jour le fichier types**

Remplacer le contenu de `packages/types/src/index.ts` :

```typescript
export type DofusType = "primordial" | "secondaire";

export type QuestType =
  | "combat_solo"
  | "combat_groupe"
  | "donjon"
  | "metier"
  | "boss"
  | "succes"
  | "horaires";

export type QuestSection = "prerequisite" | "main";

export interface Dofus {
  id: string;
  name: string;
  slug: string;
  type: DofusType;
  color: string;
  description: string;
  recommended_level: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quest {
  id: string;
  name: string;
  slug: string;
  dofuspourlesnoobs_url: string | null;
  created_at: string;
}

export interface DofusQuestChain {
  id: string;
  dofus_id: string;
  quest_id: string;
  section: QuestSection;
  sub_section: string | null;
  order_index: number;
  group_id: string | null;
  quest_types: QuestType[];
  combat_count: number | null;
  is_avoidable: boolean;
}

/** Ressource requise pour une quête spécifique */
export interface QuestResource {
  id: string;
  quest_id: string;
  name: string;
  quantity: number;
  is_kamas: boolean;
}

/** Ressource agrégée (somme de toutes les quêtes d'un Dofus) — calculée côté client */
export interface AggregatedResource {
  name: string;
  quantity: number;
  is_kamas: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Character {
  id: string;
  user_id: string;
  name: string;
  character_class: string;
  created_at: string;
}

export interface UserQuestCompletion {
  id: string;
  character_id: string;
  quest_id: string;
  completed_at: string;
}

export interface DofusProgress {
  character_id: string;
  user_id: string;
  character_name: string;
  dofus_id: string;
  dofus_name: string;
  total_quests: number;
  completed_quests: number;
  progress_pct: number;
}

/** Quest enriched with chain metadata + completion status + per-quest resources */
export interface QuestWithChain extends Quest {
  chain: DofusQuestChain;
  is_completed: boolean;
  shared_dofus_ids: string[];
  resources: QuestResource[];
}

export interface QuestProgressCounts {
  completed: number;
  total: number;
}

/** Dofus enriched with quest lists + aggregated resources for the detail page */
export interface DofusDetail extends Dofus {
  prerequisites: QuestWithChain[];
  main_quests: QuestWithChain[];
  resources: AggregatedResource[];
  progress: QuestProgressCounts;
}
```

- [ ] **Step 2: Vérifier que ça compile**

```bash
cd packages/types && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add QuestResource, AggregatedResource; remove Resource"
```

---

## Task 3: DB — getQuestsForDofus avec quest_resources

**Files:**
- Modify: `packages/db/src/queries/quests.ts`

- [ ] **Step 1: Mettre à jour la query**

Remplacer le contenu de `packages/db/src/queries/quests.ts` :

```typescript
import type { SupabaseClient } from "../client.js";
import type { QuestWithChain, QuestSection, QuestResource } from "@dofus-tracker/types";

export async function getQuestsForDofus(
  client: SupabaseClient,
  dofusId: string,
  characterId: string
): Promise<QuestWithChain[]> {
  const { data: chains, error: chainsError } = await client
    .from("dofus_quest_chains")
    .select(`*, quest:quests(*)`)
    .eq("dofus_id", dofusId)
    .order("section", { ascending: true })
    .order("order_index", { ascending: true });
  if (chainsError) throw chainsError;
  if (!chains || chains.length === 0) return [];

  const questIds = chains.map((c) => c.quest_id);

  const [
    { data: completions, error: completionsError },
    { data: allChains, error: allChainsError },
    { data: questResources, error: resourcesError },
  ] = await Promise.all([
    client
      .from("user_quest_completions")
      .select("quest_id")
      .eq("character_id", characterId)
      .in("quest_id", questIds),
    client
      .from("dofus_quest_chains")
      .select("quest_id, dofus_id")
      .in("quest_id", questIds)
      .neq("dofus_id", dofusId),
    client
      .from("quest_resources")
      .select("*")
      .in("quest_id", questIds),
  ]);

  if (completionsError) throw completionsError;
  if (allChainsError) throw allChainsError;
  if (resourcesError) throw resourcesError;

  const completedSet = new Set((completions ?? []).map((c) => c.quest_id));

  const sharedMap = new Map<string, string[]>();
  for (const c of allChains ?? []) {
    const existing = sharedMap.get(c.quest_id) ?? [];
    sharedMap.set(c.quest_id, [...existing, c.dofus_id]);
  }

  const resourcesMap = new Map<string, QuestResource[]>();
  for (const r of questResources ?? []) {
    const existing = resourcesMap.get(r.quest_id) ?? [];
    resourcesMap.set(r.quest_id, [...existing, r as QuestResource]);
  }

  return chains
    .filter((c) => c.quest != null)
    .map((c) => ({
      ...c.quest,
      chain: {
        id: c.id,
        dofus_id: c.dofus_id,
        quest_id: c.quest_id,
        section: c.section as QuestSection,
        sub_section: c.sub_section ?? null,
        order_index: c.order_index,
        group_id: c.group_id,
        quest_types: c.quest_types,
        combat_count: c.combat_count,
        is_avoidable: c.is_avoidable,
      },
      is_completed: completedSet.has(c.quest_id),
      shared_dofus_ids: sharedMap.get(c.quest_id) ?? [],
      resources: resourcesMap.get(c.quest_id) ?? [],
    }));
}

export async function toggleQuestCompletion(
  client: SupabaseClient,
  characterId: string,
  questId: string,
  completed: boolean
): Promise<void> {
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
}

export async function bulkCompleteSection(
  client: SupabaseClient,
  characterId: string,
  dofusId: string,
  section: QuestSection
): Promise<void> {
  const { data: chains, error: chainsError } = await client
    .from("dofus_quest_chains")
    .select("quest_id")
    .eq("dofus_id", dofusId)
    .eq("section", section);
  if (chainsError) throw chainsError;

  const rows = (chains ?? []).map((c) => ({
    character_id: characterId,
    quest_id: c.quest_id,
  }));
  if (rows.length === 0) return;

  const { error } = await client
    .from("user_quest_completions")
    .upsert(rows, { onConflict: "character_id,quest_id", ignoreDuplicates: true });
  if (error) throw error;
}
```

- [ ] **Step 2: Supprimer resources.ts et mettre à jour index.ts**

Supprimer `packages/db/src/queries/resources.ts`.

Remplacer `packages/db/src/index.ts` :

```typescript
export { createSupabaseClient } from "./client.js";
export type { SupabaseClient } from "./client.js";

export {
  getDofusList,
  getDofusById,
  getDofusBySlug,
  getDofusProgressForCharacter,
} from "./queries/dofus.js";

export {
  getCharacters,
  createCharacter,
  deleteCharacter,
} from "./queries/characters.js";

export {
  getQuestsForDofus,
  toggleQuestCompletion,
  bulkCompleteSection,
} from "./queries/quests.js";
```

- [ ] **Step 3: Typecheck**

```bash
cd packages/db && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/queries/quests.ts packages/db/src/index.ts
git rm packages/db/src/queries/resources.ts
git commit -m "feat(db): attach quest_resources to QuestWithChain, remove getResourcesForDofus"
```

---

## Task 4: UI hook — useResources

**Files:**
- Modify: `packages/ui/src/hooks/useResources.ts`

- [ ] **Step 1: Mettre à jour le hook**

Remplacer le contenu de `packages/ui/src/hooks/useResources.ts` :

```typescript
import { useState } from "react";
import type { AggregatedResource } from "@dofus-tracker/types";

export function useResources(resources: AggregatedResource[]) {
  const [multiplier, setMultiplier] = useState(1);

  const items = resources.filter((r) => !r.is_kamas);
  const kamas = resources.filter((r) => r.is_kamas);
  const getQuantity = (r: AggregatedResource) => r.quantity * multiplier;

  return { multiplier, setMultiplier, items, kamas, getQuantity };
}
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/ui && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/hooks/useResources.ts
git commit -m "feat(ui): update useResources hook for AggregatedResource"
```

---

## Task 5: Sync — Apps Script client

**Files:**
- Create: `packages/sync/src/apps-script-client.ts`
- Create: `packages/sync/src/__tests__/apps-script-client.test.ts`

- [ ] **Step 1: Écrire le test en premier**

Créer `packages/sync/src/__tests__/apps-script-client.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { extractQuestsWithResources } from "../apps-script-client.js";
import type { AppsScriptData } from "../apps-script-client.js";

const SAMPLE: AppsScriptData = {
  metadata: { lastUpdate: "2026-04-04T00:00:00.000Z" },
  dofus: {
    "Dofus Argenté": [
      {
        titre: "Général",
        sous_sections: [
          {
            titre: "Début",
            quetes: [
              {
                nom: "L'anneau de tous les dangers",
                termine: false,
                instruction: "",
                ressources: [],
              },
              {
                nom: "Produits naturels",
                termine: false,
                instruction: "",
                ressources: [
                  { nom: "Blé", quantite: 4 },
                  { nom: "Ortie", quantite: 4 },
                ],
              },
              {
                nom: "Biere qui roule n'amasse pas mousse",
                termine: false,
                instruction: "",
                ressources: [{ nom: "Kamas", quantite: 40 }],
              },
            ],
          },
        ],
      },
    ],
  },
};

describe("extractQuestsWithResources", () => {
  it("skips quests without resources", () => {
    const result = extractQuestsWithResources(SAMPLE);
    const slugs = result.map((q) => q.slug);
    expect(slugs).not.toContain("l-anneau-de-tous-les-dangers");
  });

  it("returns quests with resources with correct slug", () => {
    const result = extractQuestsWithResources(SAMPLE);
    const produits = result.find((q) => q.slug === "produits-naturels");
    expect(produits).toBeDefined();
    expect(produits!.resources).toHaveLength(2);
    expect(produits!.resources[0]).toEqual({ name: "Blé", quantity: 4, is_kamas: false });
    expect(produits!.resources[1]).toEqual({ name: "Ortie", quantity: 4, is_kamas: false });
  });

  it("marks Kamas resources with is_kamas: true", () => {
    const result = extractQuestsWithResources(SAMPLE);
    const biere = result.find((q) => q.slug === "biere-qui-roule-n-amasse-pas-mousse");
    expect(biere).toBeDefined();
    expect(biere!.resources[0]).toEqual({ name: "Kamas", quantity: 40, is_kamas: true });
  });

  it("deduplicates same quest name across sections", () => {
    const data: AppsScriptData = {
      metadata: { lastUpdate: "2026-04-04T00:00:00.000Z" },
      dofus: {
        "Dofus A": [
          {
            titre: "Sec 1",
            sous_sections: [
              {
                titre: "Sub 1",
                quetes: [{ nom: "Quête X", termine: false, instruction: "", ressources: [{ nom: "Fer", quantite: 3 }] }],
              },
            ],
          },
          {
            titre: "Sec 2",
            sous_sections: [
              {
                titre: "Sub 2",
                quetes: [{ nom: "Quête X", termine: false, instruction: "", ressources: [{ nom: "Fer", quantite: 3 }] }],
              },
            ],
          },
        ],
      },
    };
    const result = extractQuestsWithResources(data);
    const matches = result.filter((q) => q.slug === "quete-x");
    expect(matches).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Lancer le test — doit échouer**

```bash
cd packages/sync && pnpm test __tests__/apps-script-client.test.ts
```

Expected: FAIL — `apps-script-client.ts` n'existe pas encore.

- [ ] **Step 3: Implémenter apps-script-client.ts**

Créer `packages/sync/src/apps-script-client.ts` :

```typescript
import { nameToSlug } from "./utils.js";

export interface AppsScriptQuest {
  nom: string;
  termine: boolean;
  instruction: string;
  ressources: Array<{ nom: string; quantite: number }>;
}

export interface AppsScriptSubSection {
  titre: string;
  quetes: AppsScriptQuest[];
}

export interface AppsScriptSection {
  titre: string;
  sous_sections: AppsScriptSubSection[];
}

export interface AppsScriptData {
  metadata: { lastUpdate: string };
  dofus: Record<string, AppsScriptSection[]>;
}

export interface QuestWithResources {
  slug: string;
  resources: Array<{ name: string; quantity: number; is_kamas: boolean }>;
}

/** Fetch the Apps Script web endpoint and return parsed JSON */
export async function fetchAppsScriptData(url: string): Promise<AppsScriptData> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Apps Script fetch failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<AppsScriptData>;
}

/**
 * Flatten all Dofus/sections/sous_sections into a deduplicated list of quests
 * that have at least one resource. Result is keyed by quest slug (one entry per
 * unique quest name across all Dofus).
 */
export function extractQuestsWithResources(data: AppsScriptData): QuestWithResources[] {
  const seen = new Map<string, QuestWithResources>();

  for (const sections of Object.values(data.dofus)) {
    for (const section of sections) {
      for (const sub of section.sous_sections) {
        for (const quest of sub.quetes) {
          if (quest.ressources.length === 0) continue;

          const slug = nameToSlug(quest.nom);
          if (seen.has(slug)) continue; // deduplicate by slug

          seen.set(slug, {
            slug,
            resources: quest.ressources.map((r) => ({
              name: r.nom,
              quantity: r.quantite,
              is_kamas: r.nom.toLowerCase() === "kamas",
            })),
          });
        }
      }
    }
  }

  return Array.from(seen.values());
}
```

- [ ] **Step 4: Lancer les tests — doivent passer**

```bash
cd packages/sync && pnpm test __tests__/apps-script-client.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/sync/src/apps-script-client.ts packages/sync/src/__tests__/apps-script-client.test.ts
git commit -m "feat(sync): add apps-script-client with extractQuestsWithResources"
```

---

## Task 6: Sync — Apps Script upsert + chaîner les deux syncs

**Files:**
- Create: `packages/sync/src/sync-apps-script-upsert.ts`
- Modify: `packages/sync/src/upsert.ts`
- Modify: `packages/sync/src/index.ts`
- Modify: `.env.example`

- [ ] **Step 1: Créer sync-apps-script-upsert.ts**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppsScriptData } from "./apps-script-client.js";
import { extractQuestsWithResources } from "./apps-script-client.js";

export interface AppsScriptSyncReport {
  resourcesUpserted: number;
  questsUnmatched: string[];
  errors: string[];
}

export async function syncQuestResources(
  data: AppsScriptData,
  client: SupabaseClient
): Promise<AppsScriptSyncReport> {
  const report: AppsScriptSyncReport = {
    resourcesUpserted: 0,
    questsUnmatched: [],
    errors: [],
  };

  const quests = extractQuestsWithResources(data);
  if (quests.length === 0) return report;

  // 1. Fetch all quest slugs → ids from DB in one query
  const slugs = quests.map((q) => q.slug);
  const { data: dbQuests, error: fetchError } = await client
    .from("quests")
    .select("id, slug")
    .in("slug", slugs);

  if (fetchError) {
    report.errors.push(`Failed to fetch quests: ${fetchError.message}`);
    return report;
  }

  const slugToId = new Map<string, string>(
    (dbQuests ?? []).map((q) => [q.slug, q.id])
  );

  // 2. Identify unmatched quests (in Apps Script but not in DB)
  for (const q of quests) {
    if (!slugToId.has(q.slug)) {
      report.questsUnmatched.push(q.slug);
    }
  }

  const matched = quests.filter((q) => slugToId.has(q.slug));
  if (matched.length === 0) return report;

  const matchedQuestIds = matched.map((q) => slugToId.get(q.slug)!);

  // 3. Delete existing quest_resources for all matched quests
  const { error: deleteError } = await client
    .from("quest_resources")
    .delete()
    .in("quest_id", matchedQuestIds);

  if (deleteError) {
    report.errors.push(`Delete failed: ${deleteError.message}`);
    return report;
  }

  // 4. Insert all new quest_resources
  const rows = matched.flatMap((q) =>
    q.resources.map((r) => ({
      quest_id: slugToId.get(q.slug)!,
      name: r.name,
      quantity: r.quantity,
      is_kamas: r.is_kamas,
    }))
  );

  const { error: insertError } = await client
    .from("quest_resources")
    .insert(rows);

  if (insertError) {
    report.errors.push(`Insert failed: ${insertError.message}`);
    return report;
  }

  report.resourcesUpserted = rows.length;
  return report;
}
```

- [ ] **Step 2: Retirer parseResourceRows de upsert.ts**

Dans `packages/sync/src/upsert.ts`, supprimer :
- L'import `import { parseResourceRows } from "./parsers/resource-parser.js";`
- Le champ `resourcesUpserted` de `SyncReport`
- Tout le bloc commenté `// 4. Replace resources for this Dofus` (lignes 139–156)
- La ligne `totalResources += report.resourcesUpserted;` dans index.ts

Le fichier `upsert.ts` devient :

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseQuestRow, SECTION_MAP, type ParsedQuestRow } from "./parsers/quest-row-parser.js";

type ParsedWithSubSection = ParsedQuestRow & { sub_section: string | null };
import { assignGroupIds } from "./parsers/group-detector.js";
import type { SheetTab } from "./sheets-client.js";
import { nameToSlug } from "./utils.js";

export interface SyncReport {
  dofusName: string;
  questsUpserted: number;
  errors: string[];
}

export async function syncTabToSupabase(
  tab: SheetTab,
  client: SupabaseClient
): Promise<SyncReport> {
  const report: SyncReport = {
    dofusName: tab.dofusName,
    questsUpserted: 0,
    errors: [],
  };

  try {
    const { data: dofusRow, error: dofusError } = await client
      .from("dofus")
      .upsert(
        {
          name: tab.dofusName,
          slug: tab.dofusSlug,
          type: "primordial",
          color: "#4ade80",
          description: "",
          recommended_level: 0,
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (dofusError || !dofusRow) {
      report.errors.push(`Dofus upsert failed: ${dofusError?.message}`);
      return report;
    }

    const dofusId = dofusRow.id as string;

    const dataRows = tab.rows.slice(1);

    let currentSection = "Prérequis";
    let currentSubSection: string | null = null;
    const parsedRows: ParsedWithSubSection[] = [];

    for (const row of dataRows) {
      const sectionInRow = row.map((c) => c?.trim()).find((c) => !!c && c in SECTION_MAP);
      if (sectionInRow) {
        currentSection = sectionInRow;
        currentSubSection = null;
        continue;
      }

      const hasHyperlink = row.some(
        (c) => typeof c === "string" && c.toLowerCase().startsWith("=hyperlink(")
      );
      if (hasHyperlink) {
        const parsed = parseQuestRow(row, currentSection);
        if (parsed) parsedRows.push({ ...parsed, sub_section: currentSubSection });
        continue;
      }

      if (SECTION_MAP[currentSection] === "main") {
        const textCell = row.map((c) => c?.trim()).find((c) => !!c);
        if (textCell) currentSubSection = textCell;
      }
    }

    const rowsWithGroups = assignGroupIds(parsedRows);

    let orderIndex = 0;
    for (const row of rowsWithGroups) {
      const slug = nameToSlug(row.name);

      const { data: questRow, error: questError } = await client
        .from("quests")
        .upsert(
          { name: row.name, slug, dofuspourlesnoobs_url: row.dofuspourlesnoobs_url },
          { onConflict: "slug" }
        )
        .select("id")
        .single();

      if (questError || !questRow) {
        report.errors.push(`Quest upsert failed for "${row.name}": ${questError?.message}`);
        continue;
      }

      const { error: chainError } = await client
        .from("dofus_quest_chains")
        .upsert(
          {
            dofus_id: dofusId,
            quest_id: questRow.id,
            section: row.section,
            sub_section: row.sub_section,
            order_index: orderIndex++,
            group_id: row.group_id,
            quest_types: row.quest_types,
            combat_count: row.combat_count,
            is_avoidable: row.is_avoidable,
          },
          { onConflict: "dofus_id,quest_id" }
        );

      if (chainError) {
        report.errors.push(`Chain upsert failed for "${row.name}": ${chainError.message}`);
        continue;
      }

      report.questsUpserted++;
    }
  } catch (err) {
    report.errors.push(
      `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return report;
}
```

- [ ] **Step 3: Mettre à jour index.ts pour chaîner les deux syncs**

Remplacer `packages/sync/src/index.ts` :

```typescript
import { createClient } from "@supabase/supabase-js";
import { fetchAllSheetTabs } from "./sheets-client.js";
import { syncTabToSupabase } from "./upsert.js";
import { fetchAppsScriptData } from "./apps-script-client.js";
import { syncQuestResources } from "./sync-apps-script-upsert.js";

async function main() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ?? "./service-account.json";
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;

  if (!sheetId || !supabaseUrl || !serviceRoleKey || !appsScriptUrl) {
    console.error(
      "Missing required env vars: GOOGLE_SHEET_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APPS_SCRIPT_URL"
    );
    process.exit(1);
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  // ── Phase 1: Sync quests + chains from Google Sheets ──────────────────────
  console.log("📋 Phase 1: Fetching Google Sheet tabs...");
  const tabs = await fetchAllSheetTabs(sheetId, keyPath);
  console.log(`Found ${tabs.length} Dofus tab(s): ${tabs.map((t) => t.dofusName).join(", ")}`);

  let totalQuests = 0;
  const allErrors: string[] = [];

  for (const tab of tabs) {
    process.stdout.write(`⚙️  Syncing "${tab.dofusName}"... `);
    const report = await syncTabToSupabase(tab, client);
    console.log(`✅ ${report.questsUpserted} quests`);

    if (report.errors.length > 0) {
      console.warn(`   ⚠️  ${report.errors.length} error(s):`, report.errors);
      allErrors.push(...report.errors);
    }

    totalQuests += report.questsUpserted;
  }

  console.log(`\n✅ Phase 1 complete: ${totalQuests} quests`);

  // ── Phase 2: Sync quest resources from Apps Script ────────────────────────
  console.log("\n📦 Phase 2: Fetching Apps Script data...");
  const appsScriptData = await fetchAppsScriptData(appsScriptUrl);
  console.log(`Last update: ${appsScriptData.metadata.lastUpdate}`);

  process.stdout.write("⚙️  Syncing quest resources... ");
  const resourceReport = await syncQuestResources(appsScriptData, client);
  console.log(`✅ ${resourceReport.resourcesUpserted} resources upserted`);

  if (resourceReport.questsUnmatched.length > 0) {
    console.warn(
      `   ⚠️  ${resourceReport.questsUnmatched.length} quest(s) in Apps Script not found in DB:`,
      resourceReport.questsUnmatched
    );
  }

  if (resourceReport.errors.length > 0) {
    console.error(`   ❌ Errors:`, resourceReport.errors);
    allErrors.push(...resourceReport.errors);
  }

  console.log(`\n✅ Sync complete: ${totalQuests} quests, ${resourceReport.resourcesUpserted} resources`);

  if (allErrors.length > 0) {
    console.error(`❌ ${allErrors.length} total error(s) — check output above`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
```

- [ ] **Step 4: Mettre à jour .env.example**

Ajouter à la fin de `.env.example` :

```
# Apps Script — resources per quest
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

- [ ] **Step 5: Supprimer resource-parser + son test**

```bash
git rm packages/sync/src/parsers/resource-parser.ts
git rm packages/sync/src/__tests__/resource-parser.test.ts
```

- [ ] **Step 6: Typecheck + tests sync**

```bash
cd packages/sync && pnpm typecheck && pnpm test
```

Expected: typecheck clean, tous les tests passent (resource-parser tests supprimés).

- [ ] **Step 7: Commit**

```bash
git add packages/sync/src/ .env.example
git commit -m "feat(sync): chain sheets + apps-script syncs, remove resource-parser"
```

---

## Task 7: Mobile — screen [slug].tsx

**Files:**
- Modify: `apps/mobile/app/dofus/[slug].tsx`

- [ ] **Step 1: Mettre à jour le screen**

Remplacer le contenu de `apps/mobile/app/dofus/[slug].tsx` :

```tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import type { BottomSheetHandle } from "@/components/shared/CustomBottomSheet";
import {
  getDofusList,
  getDofusBySlug,
  getQuestsForDofus,
} from "@dofus-tracker/db";
import { useQuestToggle } from "@dofus-tracker/ui";
import { DofusHeader } from "@/components/dofus/DofusHeader";
import { QuestSection } from "@/components/dofus/QuestSection";
import { ResourceSection } from "@/components/dofus/ResourceSection";
import { ResourceBottomSheet } from "@/components/resources/ResourceBottomSheet";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import type {
  Dofus,
  QuestWithChain,
  AggregatedResource,
  QuestSection as QuestSectionType,
} from "@dofus-tracker/types";

export default function DofusDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const bottomSheetRef = useRef<BottomSheetHandle>(null);

  const [dofus, setDofus] = useState<Dofus | null>(null);
  const [allDofus, setAllDofus] = useState<Dofus[]>([]);
  const [quests, setQuests] = useState<QuestWithChain[]>([]);
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
      const q = await getQuestsForDofus(supabase, foundDofus.id, activeCharacterId);
      setQuests(q);
    }
    setLoading(false);
  }, [slug, activeCharacterId]);

  useEffect(() => { loadData(); }, [loadData]);

  const prerequisites = quests.filter((q) => q.chain.section === "prerequisite");
  const mainQuests = quests.filter((q) => q.chain.section === "main");
  const completedCount = quests.filter((q) => q.is_completed).length;

  // Aggregate resources from all quests (sum by name)
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

  // Group main quests by sub_section, preserving order of first appearance
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
        {mainQuestGroups.map(({ title, quests: groupQuests }) => (
          <QuestSection
            key={title}
            title={title}
            quests={groupQuests}
            dofusColor={dofus.color}
            onToggle={handleToggle}
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

- [ ] **Step 2: Typecheck mobile**

```bash
cd apps/mobile && pnpm typecheck
```

Expected: erreurs résiduelles sur ResourceBottomSheet et ResourceSection (corrigées à Task 8).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/dofus/[slug].tsx
git commit -m "feat(mobile): compute aggregated resources from quests, remove getResourcesForDofus"
```

---

## Task 8: Mobile — ResourceBottomSheet + ResourceSection

**Files:**
- Modify: `apps/mobile/components/resources/ResourceBottomSheet.tsx`
- Modify: `apps/mobile/components/dofus/ResourceSection.tsx`

- [ ] **Step 1: Mettre à jour ResourceBottomSheet**

Remplacer le contenu de `apps/mobile/components/resources/ResourceBottomSheet.tsx` :

```tsx
import { forwardRef, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { CustomBottomSheet as BottomSheet, BottomSheetView, type BottomSheetHandle } from "@/components/shared/CustomBottomSheet";
import { useResources } from "@dofus-tracker/ui";
import type { AggregatedResource } from "@dofus-tracker/types";

interface Props {
  resources: AggregatedResource[];
  dofusColor: string;
}

const PRESETS = [1, 2, 3, 4, 5];

function formatNumber(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

export const ResourceBottomSheet = forwardRef<BottomSheetHandle, Props>(
  function ResourceBottomSheet({ resources, dofusColor }, ref) {
    const { multiplier, setMultiplier, items, kamas, getQuantity } = useResources(resources);

    const renderItem = useCallback(
      ({ item }: { item: AggregatedResource }) => (
        <View className="flex-row items-center gap-3 px-5 py-2.5 border-b border-white/5">
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
            keyExtractor={(r) => r.name}
            renderItem={renderItem}
            scrollEnabled={true}
            style={{ maxHeight: 300 }}
          />

          {kamas.map((k) => (
            <View key={k.name} className="flex-row items-center gap-3 px-5 py-3 bg-yellow-500/5 border-t border-white/5">
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

- [ ] **Step 2: Mettre à jour ResourceSection**

Remplacer le contenu de `apps/mobile/components/dofus/ResourceSection.tsx` :

```tsx
import { View, Text, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import type { AggregatedResource } from "@dofus-tracker/types";

interface Props {
  resources: AggregatedResource[];
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

- [ ] **Step 3: Typecheck mobile complet**

```bash
cd apps/mobile && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/resources/ResourceBottomSheet.tsx apps/mobile/components/dofus/ResourceSection.tsx
git commit -m "feat(mobile): update ResourceBottomSheet and ResourceSection for AggregatedResource"
```

---

## Task 9: Mobile — QuestItem expandable resources

**Files:**
- Modify: `apps/mobile/components/dofus/QuestItem.tsx`

- [ ] **Step 1: Ajouter l'expandable resources**

Remplacer le contenu de `apps/mobile/components/dofus/QuestItem.tsx` :

```tsx
import { useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { QuestTypeBadge } from "@/components/shared/QuestTypeBadge";
import type { QuestWithChain } from "@dofus-tracker/types";

interface Props {
  quest: QuestWithChain;
  dofusColor: string;
  onToggle: (questId: string, completed: boolean) => void;
}

export function QuestItem({ quest, dofusColor, onToggle }: Props) {
  const { chain, is_completed, shared_dofus_ids, resources } = quest;
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const hasResources = resources.length > 0;

  function handlePress() {
    if (quest.dofuspourlesnoobs_url) {
      Linking.openURL(quest.dofuspourlesnoobs_url);
    }
  }

  return (
    <View
      className="rounded-xl mb-1 overflow-hidden"
      style={{
        backgroundColor: is_completed ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
      }}
    >
      {/* Main row */}
      <View className="flex-row items-start gap-3 px-3 py-2.5">
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

        {/* Right side: order + resources toggle */}
        <View className="items-end gap-1 shrink-0 mt-0.5">
          <Text className="text-xs text-gray-600">#{chain.order_index}</Text>
          {hasResources && (
            <Pressable
              onPress={() => setResourcesExpanded((v) => !v)}
              hitSlop={6}
              className="px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              <Text className="text-xs" style={{ color: dofusColor }}>
                {resourcesExpanded ? "▲" : `📦 ${resources.length}`}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Expandable resources */}
      {resourcesExpanded && (
        <View className="border-t border-white/5 px-3 py-2 gap-1">
          {resources.map((r) => (
            <View key={r.id} className="flex-row justify-between items-center">
              <Text className="text-xs text-gray-400">{r.name}</Text>
              <Text className="text-xs font-semibold" style={{ color: dofusColor }}>
                ×{r.quantity}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/mobile && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/dofus/QuestItem.tsx
git commit -m "feat(mobile): add expandable per-quest resources to QuestItem"
```

---

## Task 10: Web — DofusDetailClient + ResourcePanel

**Files:**
- Modify: `apps/web/components/dofus/DofusDetailClient.tsx`
- Modify: `apps/web/components/dofus/ResourcePanel.tsx`

- [ ] **Step 1: Mettre à jour DofusDetailClient**

Remplacer le contenu de `apps/web/components/dofus/DofusDetailClient.tsx` :

```tsx
"use client";

import { useEffect, useState } from "react";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { useSupabase } from "@/app/providers";
import {
  getQuestsForDofus,
  toggleQuestCompletion,
  bulkCompleteSection,
} from "@dofus-tracker/db";
import { DofusHeader } from "./DofusHeader";
import { QuestSection } from "./QuestSection";
import { ResourcePanel } from "./ResourcePanel";
import type { Dofus, QuestWithChain, AggregatedResource, QuestSection as QuestSectionType } from "@dofus-tracker/types";

interface Props {
  dofus: Dofus;
  allDofus: Dofus[];
  userId: string;
}

export function DofusDetailClient({ dofus, allDofus, userId: _userId }: Props) {
  const supabase = useSupabase();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);

  const [quests, setQuests] = useState<QuestWithChain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCharacterId) {
      setQuests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getQuestsForDofus(supabase, dofus.id, activeCharacterId)
      .then(setQuests)
      .finally(() => setLoading(false));
  }, [supabase, dofus.id, activeCharacterId]);

  async function handleToggle(questId: string, completed: boolean) {
    if (!activeCharacterId) return;
    setQuests((prev) =>
      prev.map((q) => (q.id === questId ? { ...q, is_completed: completed } : q))
    );
    try {
      await toggleQuestCompletion(supabase, activeCharacterId, questId, completed);
    } catch {
      setQuests((prev) =>
        prev.map((q) => (q.id === questId ? { ...q, is_completed: !completed } : q))
      );
    }
  }

  async function handleBulkComplete(section: QuestSectionType) {
    if (!activeCharacterId) return;
    setQuests((prev) =>
      prev.map((q) => (q.chain.section === section ? { ...q, is_completed: true } : q))
    );
    try {
      await bulkCompleteSection(supabase, activeCharacterId, dofus.id, section);
    } catch {
      const fresh = await getQuestsForDofus(supabase, dofus.id, activeCharacterId);
      setQuests(fresh);
    }
  }

  const prerequisites = quests.filter((q) => q.chain.section === "prerequisite");
  const mainQuests = quests.filter((q) => q.chain.section === "main");
  const completedCount = quests.filter((q) => q.is_completed).length;

  // Group main quests by sub_section
  const mainQuestGroups: Array<{ title: string; quests: typeof mainQuests }> = [];
  for (const quest of mainQuests) {
    const title = quest.chain.sub_section ?? "Les quêtes";
    const existing = mainQuestGroups.find((g) => g.title === title);
    if (existing) existing.quests.push(quest);
    else mainQuestGroups.push({ title, quests: [quest] });
  }

  // Aggregate resources from all quests
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

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-6">
          <DofusHeader
            dofus={dofus}
            allDofus={allDofus}
            quests={quests}
            completedCount={completedCount}
          />

          {loading ? (
            <p className="text-gray-400 text-sm animate-pulse">Chargement des quêtes…</p>
          ) : (
            <>
              {prerequisites.length > 0 && (
                <QuestSection
                  title="Prérequis"
                  quests={prerequisites}
                  dofusColor={dofus.color}
                  onToggle={handleToggle}
                  onBulkComplete={() => handleBulkComplete("prerequisite")}
                />
              )}
              {mainQuestGroups.map(({ title, quests: groupQuests }) => (
                <QuestSection
                  key={title}
                  title={title}
                  quests={groupQuests}
                  dofusColor={dofus.color}
                  onToggle={handleToggle}
                  onBulkComplete={() => handleBulkComplete("main")}
                />
              ))}
            </>
          )}
        </div>

        {/* Right column — sticky resource panel */}
        {aggregatedResources.length > 0 && (
          <div className="lg:w-80 lg:shrink-0">
            <div className="lg:sticky lg:top-20">
              <ResourcePanel resources={aggregatedResources} dofusColor={dofus.color} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Mettre à jour ResourcePanel**

Remplacer le contenu de `apps/web/components/dofus/ResourcePanel.tsx` :

```tsx
"use client";

import { useState } from "react";
import type { AggregatedResource } from "@dofus-tracker/types";

const PRESETS = [1, 2, 3, 4, 5];

interface Props {
  resources: AggregatedResource[];
  dofusColor: string;
}

export function ResourcePanel({ resources, dofusColor }: Props) {
  const [multiplier, setMultiplier] = useState(1);

  const formatNumber = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

  const kamas = resources.filter((r) => r.is_kamas);
  const items = resources.filter((r) => !r.is_kamas);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div
        className="px-5 py-3.5 border-b border-white/5"
        style={{ borderTop: `2px solid ${dofusColor}44` }}
      >
        <h2 className="font-bold text-white">Ressources nécessaires</h2>
      </div>

      <div className="px-5 py-3 border-b border-white/5">
        <p className="text-xs text-gray-400 mb-2">Personnages</p>
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setMultiplier(p)}
              className={`flex-1 py-1 text-sm font-semibold rounded-lg transition-all ${
                multiplier === p ? "text-black" : "btn-secondary"
              }`}
              style={
                multiplier === p
                  ? { background: `linear-gradient(135deg, ${dofusColor}, ${dofusColor}cc)` }
                  : {}
              }
            >
              ×{p}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-white/[0.04] max-h-[60vh] overflow-y-auto">
        {items.map((resource) => (
          <div key={resource.name} className="flex items-center gap-3 px-5 py-2.5">
            <span className="text-sm text-white flex-1 min-w-0 truncate">{resource.name}</span>
            <span className="text-sm font-bold shrink-0" style={{ color: dofusColor }}>
              {formatNumber(resource.quantity * multiplier)}
            </span>
          </div>
        ))}
      </div>

      {kamas.length > 0 && (
        <div className="border-t border-white/5 px-5 py-3 bg-yellow-500/5">
          {kamas.map((k) => (
            <div key={k.name} className="flex items-center gap-3">
              <span className="text-sm text-white flex-1">{k.name}</span>
              <span className="text-sm font-bold text-yellow-400">
                {formatNumber(k.quantity * multiplier)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 py-3 border-t border-white/5">
        <p className="text-xs text-gray-500 text-center">
          {items.length} type{items.length > 1 ? "s" : ""} de ressources
          {multiplier > 1 ? ` · ×${multiplier} personnages` : ""}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck web**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/dofus/DofusDetailClient.tsx apps/web/components/dofus/ResourcePanel.tsx
git commit -m "feat(web): update DofusDetailClient and ResourcePanel for quest_resources"
```

---

## Task 11: Web — QuestItem expandable resources

**Files:**
- Modify: `apps/web/components/dofus/QuestItem.tsx`

- [ ] **Step 1: Ajouter l'expandable resources**

Remplacer le contenu de `apps/web/components/dofus/QuestItem.tsx` :

```tsx
"use client";

import { useState } from "react";
import type { QuestWithChain, QuestType } from "@dofus-tracker/types";

const BADGE_CONFIG: Record<QuestType, { label: string; color: string }> = {
  combat_solo: { label: "Combat solo", color: "#ef4444" },
  combat_groupe: { label: "Groupe", color: "#f97316" },
  donjon: { label: "Donjon", color: "#a855f7" },
  metier: { label: "Métier", color: "#eab308" },
  boss: { label: "Boss", color: "#dc2626" },
  succes: { label: "Succès", color: "#06b6d4" },
  horaires: { label: "Horaires", color: "#64748b" },
};

interface Props {
  quest: QuestWithChain;
  dofusColor: string;
  onToggle: (questId: string, completed: boolean) => void;
}

export function QuestItem({ quest, dofusColor, onToggle }: Props) {
  const { chain, is_completed, shared_dofus_ids, resources } = quest;
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const hasResources = resources.length > 0;

  return (
    <div
      className={`rounded-xl transition-colors ${is_completed ? "opacity-60" : ""}`}
      style={{
        background: is_completed ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
      }}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <input
          type="checkbox"
          checked={is_completed}
          onChange={(e) => onToggle(quest.id, e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#4ade80] rounded"
          aria-label={quest.name}
        />

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={quest.dofuspourlesnoobs_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm font-medium hover:underline transition-colors ${
                is_completed ? "line-through text-gray-500" : "text-white"
              }`}
            >
              {quest.name}
            </a>

            {shared_dofus_ids.length > 0 && (
              <span
                title={`Requise par ${shared_dofus_ids.length} autre${shared_dofus_ids.length > 1 ? "s" : ""} Dofus`}
                className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: "#3b82f622", color: "#60a5fa", border: "1px solid #3b82f644" }}
              >
                ×{shared_dofus_ids.length + 1}
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-1.5">
            {chain.quest_types.map((type) => {
              const badge = BADGE_CONFIG[type];
              return (
                <span
                  key={type}
                  className="text-xs px-2 py-0.5 rounded-md font-medium"
                  style={{
                    background: `${badge.color}22`,
                    color: badge.color,
                    border: `1px solid ${badge.color}44`,
                  }}
                >
                  {badge.label}
                  {type === "combat_solo" && chain.combat_count && chain.combat_count > 1
                    ? ` ×${chain.combat_count}`
                    : ""}
                </span>
              );
            })}

            {chain.is_avoidable && (
              <span className="text-xs px-2 py-0.5 rounded-md font-medium text-gray-400 border border-gray-700">
                Évitable
              </span>
            )}
          </div>
        </div>

        {/* Right: order + resources toggle */}
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <span className="text-xs text-gray-600">#{chain.order_index}</span>
          {hasResources && (
            <button
              onClick={() => setResourcesExpanded((v) => !v)}
              className="text-xs px-2 py-0.5 rounded transition-colors"
              style={{
                background: resourcesExpanded ? `${dofusColor}22` : "rgba(255,255,255,0.06)",
                color: resourcesExpanded ? dofusColor : "#9ca3af",
                border: `1px solid ${resourcesExpanded ? dofusColor + "44" : "transparent"}`,
              }}
              title="Ressources requises"
            >
              📦 {resources.length}
            </button>
          )}
        </div>
      </div>

      {/* Expandable resources */}
      {resourcesExpanded && (
        <div className="border-t border-white/5 px-4 py-2 space-y-1">
          {resources.map((r) => (
            <div key={r.id} className="flex justify-between items-center">
              <span className="text-xs text-gray-400">{r.name}</span>
              <span className="text-xs font-semibold" style={{ color: dofusColor }}>
                ×{r.quantity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck web**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/dofus/QuestItem.tsx
git commit -m "feat(web): add expandable per-quest resources to QuestItem"
```

---

## Task 12: Typecheck global + lancer le sync

**Files:** aucun

- [ ] **Step 1: Typecheck tous les packages**

```bash
cd /path/to/dofus-tracker && pnpm typecheck
```

Expected: 0 erreurs dans tous les packages.

- [ ] **Step 2: Tests sync**

```bash
cd packages/sync && pnpm test
```

Expected: tous les tests passent.

- [ ] **Step 3: Ajouter APPS_SCRIPT_URL dans .env et lancer le sync**

Ajouter dans `.env` :
```
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbzVGlnOi2grwg2Efw7mf4lEFln88PC8UxWSCXGsYq3aBcKt_jc_yWVVqF-lslYmrki4lg/exec
```

Lancer :
```bash
cd packages/sync && pnpm start
```

Expected output :
```
📋 Phase 1: Fetching Google Sheet tabs...
Found N Dofus tab(s): ...
⚙️  Syncing "Dofus Argenté"... ✅ N quests
...
✅ Phase 1 complete: N quests

📦 Phase 2: Fetching Apps Script data...
⚙️  Syncing quest resources... ✅ N resources upserted
   ⚠️  X quest(s) in Apps Script not found in DB: [...]   ← noter ces slugs

✅ Sync complete: N quests, N resources
```

Vérifier que les quêtes non-matchées (si présentes) sont du bruit (quêtes sans HYPERLINK dans le sheet mais avec checkbox).

- [ ] **Step 4: Commit final**

```bash
git add .env.example
git commit -m "chore: add APPS_SCRIPT_URL to env example"
```
