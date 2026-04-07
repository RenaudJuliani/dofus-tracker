# Job Variant (Alchimiste / Paysan) DDG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un sélecteur de métier (Alchimiste / Paysan) pour le Dofus des Glaces, qui affiche les 10 quêtes du métier choisi à la bonne position dans l'ordre global des quêtes.

**Architecture:** Nouveau champ `job_variant` sur `dofus_quest_chains` (même pattern que `alignment`). Le sync applique les overrides depuis un fichier `job-variant-overrides.ts` et s'assure que les quêtes alchimiste existent en DB avec le bon `order_index` (copié du paysan correspondant). L'UI filtre via `isQuestVisible` comme pour l'alignement.

**Tech Stack:** Supabase (PostgreSQL), TypeScript, Next.js 14, React, Vitest

---

## File Map

| Action | Fichier | Rôle |
|---|---|---|
| Create | `supabase/migrations/20260406000003_job_variant.sql` | Colonne `job_variant` sur `dofus_quest_chains` |
| Modify | `packages/types/src/index.ts` | Type `JobVariant`, champ `job_variant` sur `DofusQuestChain` |
| Create | `packages/sync/src/job-variant-overrides.ts` | Liste des paires alchi/paysan + fonctions de lookup |
| Create | `packages/sync/src/__tests__/job-variant-overrides.test.ts` | Tests unitaires des fonctions de lookup |
| Modify | `packages/sync/src/sync-apps-script-upsert.ts` | Appliquer `job_variant` + créer chaînes alchi manquantes |
| Modify | `packages/db/src/queries/quests.ts` | Inclure `job_variant` + filtrer bulk complete |
| Modify | `apps/web/components/dofus/DofusDetailClient.tsx` | Sélecteur métier + filtre `isQuestVisible` |

---

## Task 1 — Migration DB

**Files:**
- Create: `supabase/migrations/20260406000003_job_variant.sql`

- [ ] **Créer le fichier de migration**

```sql
-- Add job_variant column to dofus_quest_chains
ALTER TABLE dofus_quest_chains
  ADD COLUMN IF NOT EXISTS job_variant text CHECK (job_variant IN ('alchimiste', 'paysan'));
```

- [ ] **Appliquer la migration en local**

```bash
npx supabase db push
```

Expected: migration appliquée sans erreur. Vérifier dans Supabase Studio que la colonne `job_variant` existe sur `dofus_quest_chains`.

- [ ] **Commit**

```bash
git add supabase/migrations/20260406000003_job_variant.sql
git commit -m "feat(db): add job_variant column to dofus_quest_chains"
```

---

## Task 2 — Types

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Ajouter `JobVariant` et mettre à jour `DofusQuestChain`**

Dans `packages/types/src/index.ts`, après la ligne `export type AlignmentOrder = ...` (ligne 22), ajouter :

```ts
export type JobVariant = "alchimiste" | "paysan";
```

Dans `DofusQuestChain` (après `alignment_order: AlignmentOrder | null;`, ligne 57), ajouter :

```ts
  job_variant: JobVariant | null;
```

Le résultat final de `DofusQuestChain` :

```ts
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
  alignment: Alignment | null;
  alignment_order: AlignmentOrder | null;
  job_variant: JobVariant | null;
}
```

- [ ] **Vérifier la compilation**

```bash
cd packages/types && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add JobVariant type and job_variant field to DofusQuestChain"
```

---

## Task 3 — job-variant-overrides.ts

**Files:**
- Create: `packages/sync/src/job-variant-overrides.ts`
- Create: `packages/sync/src/__tests__/job-variant-overrides.test.ts`

- [ ] **Écrire les tests d'abord**

```ts
// packages/sync/src/__tests__/job-variant-overrides.test.ts
import { describe, it, expect } from "vitest";
import {
  getJobVariantOverride,
  getJobVariantPairs,
  getJobVariantOverrideSlugsForDofus,
} from "../job-variant-overrides.js";

describe("getJobVariantOverride", () => {
  it("returns 'paysan' for a paysan quest slug on DDG", () => {
    expect(getJobVariantOverride("dofus-des-glaces", "en-semant-se-ment")).toBe("paysan");
  });

  it("returns 'alchimiste' for an alchimiste quest slug on DDG", () => {
    expect(getJobVariantOverride("dofus-des-glaces", "cent-vingt-trois-fleurs")).toBe("alchimiste");
  });

  it("returns null for an unknown quest", () => {
    expect(getJobVariantOverride("dofus-des-glaces", "quete-inconnue")).toBeNull();
  });

  it("returns null for an unknown dofus", () => {
    expect(getJobVariantOverride("dofus-inconnu", "en-semant-se-ment")).toBeNull();
  });
});

describe("getJobVariantPairs", () => {
  it("returns 10 pairs for DDG", () => {
    const pairs = getJobVariantPairs("dofus-des-glaces");
    expect(pairs).toHaveLength(10);
  });

  it("each pair has alchimisteSlug and paysanSlug", () => {
    const pairs = getJobVariantPairs("dofus-des-glaces");
    for (const pair of pairs) {
      expect(pair.alchimisteSlug).toMatch(/^[a-z0-9-]+$/);
      expect(pair.paysanSlug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("first pair is cent-vingt-trois-fleurs / en-semant-se-ment", () => {
    const pairs = getJobVariantPairs("dofus-des-glaces");
    expect(pairs[0].alchimisteSlug).toBe("cent-vingt-trois-fleurs");
    expect(pairs[0].paysanSlug).toBe("en-semant-se-ment");
  });

  it("returns empty array for unknown dofus", () => {
    expect(getJobVariantPairs("dofus-inconnu")).toEqual([]);
  });
});

describe("getJobVariantOverrideSlugsForDofus", () => {
  it("returns 20 slugs for DDG (10 alchi + 10 paysan)", () => {
    expect(getJobVariantOverrideSlugsForDofus("dofus-des-glaces")).toHaveLength(20);
  });
});
```

- [ ] **Lancer les tests pour vérifier qu'ils échouent**

```bash
cd packages/sync && npx vitest run src/__tests__/job-variant-overrides.test.ts
```

Expected: FAIL — module introuvable.

- [ ] **Créer le fichier d'implémentation**

```ts
// packages/sync/src/job-variant-overrides.ts
import { nameToSlug } from "./utils.js";
import type { JobVariant } from "@dofus-tracker/types";

interface JobVariantPair {
  alchimiste: string; // quest name (display)
  paysan: string;     // quest name (display)
}

const RAW_PAIRS: Array<{ dofusSlug: string; pairs: JobVariantPair[] }> = [
  {
    dofusSlug: "dofus-des-glaces",
    pairs: [
      { alchimiste: "Cent Vingt trois fleurs",               paysan: "En semant, se ment" },
      { alchimiste: "Botanique-nique-nique",                  paysan: "Pomdeupin vaut mieux que trois tu l'auras" },
      { alchimiste: "A fleur de peau",                        paysan: "Massacre au hakapik" },
      { alchimiste: "Mes lys fleurs",                         paysan: "Mettre son grain de sel" },
      { alchimiste: "Rose a lys, rose a lys, oh !",           paysan: "Mauvaise graine" },
      { alchimiste: "Fleuris mais rougissent",                paysan: "Champ pomy" },
      { alchimiste: "Heureux qui comme les lys",              paysan: "Gant graine" },
      { alchimiste: "Le nom de la mycose",                    paysan: "Les graines de la discorde" },
      { alchimiste: "Crocs n'en bourrent",                    paysan: "Le champ des heros" },
      { alchimiste: "Ville fleurie",                          paysan: "Champ borde le chateau" },
    ],
  },
];

// Lookup: dofusSlug → Map<questSlug, JobVariant>
const LOOKUP: ReadonlyMap<string, ReadonlyMap<string, JobVariant>> = (() => {
  const outer = new Map<string, Map<string, JobVariant>>();
  for (const entry of RAW_PAIRS) {
    const inner = new Map<string, JobVariant>();
    for (const pair of entry.pairs) {
      inner.set(nameToSlug(pair.alchimiste), "alchimiste");
      inner.set(nameToSlug(pair.paysan), "paysan");
    }
    outer.set(entry.dofusSlug, inner);
  }
  return outer;
})();

// Pairs lookup: dofusSlug → [{ alchimisteSlug, paysanSlug }]
const PAIRS_LOOKUP: ReadonlyMap<string, ReadonlyArray<{ alchimisteSlug: string; paysanSlug: string }>> = (() => {
  const outer = new Map<string, Array<{ alchimisteSlug: string; paysanSlug: string }>>();
  for (const entry of RAW_PAIRS) {
    outer.set(
      entry.dofusSlug,
      entry.pairs.map((p) => ({ alchimisteSlug: nameToSlug(p.alchimiste), paysanSlug: nameToSlug(p.paysan) }))
    );
  }
  return outer;
})();

export function getJobVariantOverride(dofusSlug: string, questSlug: string): JobVariant | null {
  return LOOKUP.get(dofusSlug)?.get(questSlug) ?? null;
}

export function getJobVariantPairs(
  dofusSlug: string
): ReadonlyArray<{ alchimisteSlug: string; paysanSlug: string }> {
  return PAIRS_LOOKUP.get(dofusSlug) ?? [];
}

export function getJobVariantOverrideSlugsForDofus(dofusSlug: string): string[] {
  return [...(LOOKUP.get(dofusSlug)?.keys() ?? [])];
}
```

- [ ] **Lancer les tests**

```bash
cd packages/sync && npx vitest run src/__tests__/job-variant-overrides.test.ts
```

Expected: tous PASS.

- [ ] **Commit**

```bash
git add packages/sync/src/job-variant-overrides.ts packages/sync/src/__tests__/job-variant-overrides.test.ts
git commit -m "feat(sync): add job-variant-overrides for DDG alchimiste/paysan quests"
```

---

## Task 4 — Sync : appliquer job_variant + créer chaînes alchimiste

**Files:**
- Modify: `packages/sync/src/sync-apps-script-upsert.ts`

- [ ] **Importer les nouvelles fonctions**

En haut de `sync-apps-script-upsert.ts`, ajouter l'import :

```ts
import { getJobVariantOverride, getJobVariantPairs, getJobVariantOverrideSlugsForDofus } from "./job-variant-overrides.js";
```

- [ ] **Appliquer `job_variant` lors de l'upsert normal de la chaîne**

Dans la boucle `for (const entry of dofusEntries)`, trouver l'upsert de `dofus_quest_chains`. Ajouter le champ `job_variant` dans l'objet upsert, juste après `alignment_order` :

```ts
const jobVariantOverride = getJobVariantOverride(entry.dofusSlug, entry.questSlug);

const { error: chainError } = await client
  .from("dofus_quest_chains")
  .upsert(
    {
      dofus_id: dofusId,
      quest_id: questId,
      section: entry.section,
      sub_section: subSection,
      order_index: entry.orderIndex,
      group_id: null,
      quest_types: [],
      combat_count: null,
      is_avoidable: false,
      alignment: alignmentOverride?.alignment ?? null,
      alignment_order: alignmentOverride?.alignmentOrder ?? null,
      job_variant: jobVariantOverride ?? null,
    },
    { onConflict: "dofus_id,quest_id" }
  );
```

- [ ] **Créer les chaînes alchimiste manquantes après le stale cleanup**

Après le bloc `// 3. Ensure alignment-override quests exist...` et avant `// 4. Delete stale chains...`, ajouter un nouveau bloc `// 3b` :

```ts
    // 3b. Ensure alchimiste chains exist for this dofus, inheriting order_index from paysan pairs
    const jobPairs = getJobVariantPairs(dofusSlug);
    if (jobPairs.length > 0) {
      // Also protect job variant slugs from stale cleanup
      const jobVariantSlugs = getJobVariantOverrideSlugsForDofus(dofusSlug);
      if (jobVariantSlugs.length > 0) {
        const { data: jvQuests } = await client
          .from("quests")
          .select("id, slug")
          .in("slug", jobVariantSlugs);
        for (const jvq of jvQuests ?? []) {
          if (!upsertedQuestIds.includes(jvq.id)) {
            upsertedQuestIds.push(jvq.id);
          }
        }
      }

      for (const pair of jobPairs) {
        // 1. Find paysan chain to get order_index / section / sub_section
        const { data: paysanQuestRow } = await client
          .from("quests")
          .select("id")
          .eq("slug", pair.paysanSlug)
          .maybeSingle();
        if (!paysanQuestRow) continue;

        const { data: paysanChain } = await client
          .from("dofus_quest_chains")
          .select("order_index, section, sub_section")
          .eq("dofus_id", dofusId)
          .eq("quest_id", paysanQuestRow.id)
          .maybeSingle();
        if (!paysanChain) continue;

        // 2. Find or create the alchimiste quest in `quests`
        let alchimisteQuestId: string | null = null;
        const { data: existingAlchi } = await client
          .from("quests")
          .select("id")
          .eq("slug", pair.alchimisteSlug)
          .maybeSingle();

        if (existingAlchi) {
          alchimisteQuestId = existingAlchi.id;
        } else {
          // Quest doesn't exist yet — create it
          const alchimisteDisplayName = pair.alchimisteSlug
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          const { data: newQuest, error: newQuestError } = await client
            .from("quests")
            .insert({
              name: alchimisteDisplayName,
              slug: pair.alchimisteSlug,
              dofuspourlesnoobs_url: `https://www.dofuspourlesnoobs.com/${pair.alchimisteSlug}.html`,
            })
            .select("id")
            .single();
          if (newQuestError || !newQuest) {
            report.errors.push(`Failed to create alchimiste quest "${pair.alchimisteSlug}": ${newQuestError?.message}`);
            continue;
          }
          alchimisteQuestId = newQuest.id;
        }

        // 3. Upsert alchimiste chain with same position as paysan
        const { error: alchiChainError } = await client
          .from("dofus_quest_chains")
          .upsert(
            {
              dofus_id: dofusId,
              quest_id: alchimisteQuestId,
              section: paysanChain.section,
              sub_section: paysanChain.sub_section,
              order_index: paysanChain.order_index,
              group_id: null,
              quest_types: [],
              combat_count: null,
              is_avoidable: false,
              alignment: null,
              alignment_order: null,
              job_variant: "alchimiste",
            },
            { onConflict: "dofus_id,quest_id" }
          );
        if (alchiChainError) {
          report.errors.push(`Alchimiste chain upsert failed for "${pair.alchimisteSlug}": ${alchiChainError.message}`);
        } else if (!upsertedQuestIds.includes(alchimisteQuestId)) {
          upsertedQuestIds.push(alchimisteQuestId);
          report.questsUpserted++;
        }
      }
    }
```

- [ ] **Vérifier la compilation du package sync**

```bash
cd packages/sync && npx tsc --noEmit
```

Expected: aucune erreur TypeScript.

- [ ] **Lancer tous les tests du package sync**

```bash
cd packages/sync && npx vitest run
```

Expected: tous PASS.

- [ ] **Commit**

```bash
git add packages/sync/src/sync-apps-script-upsert.ts
git commit -m "feat(sync): apply job_variant overrides and ensure alchimiste chains exist for DDG"
```

---

## Task 5 — DB Query : inclure job_variant + filtrer bulk complete

**Files:**
- Modify: `packages/db/src/queries/quests.ts`

- [ ] **Inclure `job_variant` dans le mapping de `getQuestsForDofus`**

Dans la fonction `getQuestsForDofus`, dans le `.map((c) => ...)` (ligne ~61), ajouter `job_variant` dans l'objet `chain` après `alignment_order` :

```ts
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
  alignment: (c.alignment ?? null) as Alignment | null,
  alignment_order: (c.alignment_order ?? null) as AlignmentOrder | null,
  job_variant: (c.job_variant ?? null) as JobVariant | null,
},
```

Ajouter l'import de `JobVariant` en haut du fichier :

```ts
import type { QuestWithChain, QuestSection, QuestResource, AggregatedResource, Alignment, AlignmentOrder, JobVariant } from "@dofus-tracker/types";
```

- [ ] **Mettre à jour `bulkCompleteSection` pour filtrer par `job_variant`**

Modifier la signature :

```ts
export async function bulkCompleteSection(
  client: SupabaseClient,
  characterId: string,
  dofusId: string,
  section: QuestSection,
  jobVariant?: JobVariant | null
): Promise<void> {
  let chainsQuery = client
    .from("dofus_quest_chains")
    .select("quest_id")
    .eq("dofus_id", dofusId)
    .eq("section", section);

  if (jobVariant) {
    chainsQuery = chainsQuery.or(`job_variant.is.null,job_variant.eq.${jobVariant}`);
  }

  const { data: chains, error: chainsError } = await chainsQuery;
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

- [ ] **Mettre à jour `bulkUncompleteSection` de la même façon**

```ts
export async function bulkUncompleteSection(
  client: SupabaseClient,
  characterId: string,
  dofusId: string,
  section: QuestSection,
  jobVariant?: JobVariant | null
): Promise<void> {
  let chainsQuery = client
    .from("dofus_quest_chains")
    .select("quest_id")
    .eq("dofus_id", dofusId)
    .eq("section", section);

  if (jobVariant) {
    chainsQuery = chainsQuery.or(`job_variant.is.null,job_variant.eq.${jobVariant}`);
  }

  const { data: chains, error: chainsError } = await chainsQuery;
  if (chainsError) throw chainsError;

  const questIds = (chains ?? []).map((c) => c.quest_id);
  if (questIds.length === 0) return;

  const { error } = await client
    .from("user_quest_completions")
    .delete()
    .eq("character_id", characterId)
    .in("quest_id", questIds);
  if (error) throw error;
}
```

- [ ] **Vérifier la compilation**

```bash
cd packages/db && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Commit**

```bash
git add packages/db/src/queries/quests.ts
git commit -m "feat(db): include job_variant in getQuestsForDofus, filter bulk complete by job"
```

---

## Task 6 — UI : sélecteur métier + filtre isQuestVisible

**Files:**
- Modify: `apps/web/components/dofus/DofusDetailClient.tsx`

- [ ] **Ajouter les imports nécessaires**

En haut de `DofusDetailClient.tsx`, mettre à jour l'import des types :

```ts
import type { Dofus, QuestWithChain, AggregatedResource, QuestSection as QuestSectionType, Alignment, AlignmentOrder, JobVariant } from "@dofus-tracker/types";
```

- [ ] **Ajouter l'état `selectedJob` et son chargement depuis localStorage**

Après `const [selectedOrder, setSelectedOrder] = useState<AlignmentOrder | null>(null);`, ajouter :

```ts
const [selectedJob, setSelectedJob] = useState<JobVariant | null>(null);
```

Dans le `useEffect` qui charge l'alignement depuis localStorage, ajouter la lecture du job :

```ts
useEffect(() => {
  if (!activeCharacterId) return;
  const key = `alignment_${dofus.id}_${activeCharacterId}`;
  const orderKey = `alignment_order_${dofus.id}_${activeCharacterId}`;
  const jobKey = `job_variant_${dofus.id}_${activeCharacterId}`;
  const saved = localStorage.getItem(key) as Alignment | null;
  const savedOrder = localStorage.getItem(orderKey) as AlignmentOrder | null;
  const savedJob = localStorage.getItem(jobKey) as JobVariant | null;
  setSelectedAlignment(saved);
  setSelectedOrder(savedOrder);
  setSelectedJob(savedJob);
}, [dofus.id, activeCharacterId]);
```

- [ ] **Ajouter la fonction `handleJobChange`**

Après `handleOrderChange`, ajouter :

```ts
function handleJobChange(job: JobVariant | null) {
  setSelectedJob(job);
  if (!activeCharacterId) return;
  const jobKey = `job_variant_${dofus.id}_${activeCharacterId}`;
  if (job) localStorage.setItem(jobKey, job);
  else localStorage.removeItem(jobKey);
}
```

- [ ] **Détecter `hasJobVariant`**

Après `const hasNeutre = alignments.includes("neutre");`, ajouter :

```ts
const hasJobVariant = quests.some((q) => q.chain.job_variant !== null);
```

- [ ] **Mettre à jour `isQuestVisible` pour filtrer par `job_variant`**

Modifier la fonction `isQuestVisible` pour ajouter le filtre job_variant à la fin, avant `return true` :

```ts
function isQuestVisible(q: QuestWithChain): boolean {
  const a = q.chain.alignment;
  // Common quests (no alignment) are always shown
  if (a === null) return true;
  // If this dofus has no alignment quests at all, show everything
  if (!hasAlignment) return true;
  // Alignment-specific quests: only shown when their alignment is selected
  if (!selectedAlignment || a !== selectedAlignment) return false;
  // Order quests: only shown when their specific order is selected
  if (q.chain.alignment_order !== null) {
    return q.chain.alignment_order === selectedOrder;
  }
  return true;
}
```

Remplacer complètement par :

```ts
function isQuestVisible(q: QuestWithChain): boolean {
  // Job variant filter: quêtes métier masquées si l'autre métier est sélectionné ou si aucun métier n'est choisi
  if (q.chain.job_variant !== null) {
    if (!selectedJob || q.chain.job_variant !== selectedJob) return false;
  }

  const a = q.chain.alignment;
  if (a === null) return true;
  if (!hasAlignment) return true;
  if (!selectedAlignment || a !== selectedAlignment) return false;
  if (q.chain.alignment_order !== null) {
    return q.chain.alignment_order === selectedOrder;
  }
  return true;
}
```

- [ ] **Mettre à jour les appels `handleBulkComplete` et `handleBulkUncomplete` pour passer `selectedJob`**

Modifier les appels dans le JSX. Remplacer :

```tsx
onBulkComplete={() => handleBulkComplete("prerequisite")}
onBulkUncomplete={() => handleBulkUncomplete("prerequisite")}
```

par :

```tsx
onBulkComplete={() => handleBulkComplete("prerequisite", selectedJob)}
onBulkUncomplete={() => handleBulkUncomplete("prerequisite", selectedJob)}
```

Et pareil pour `"main"` :

```tsx
onBulkComplete={() => handleBulkComplete("main", selectedJob)}
onBulkUncomplete={() => handleBulkUncomplete("main", selectedJob)}
```

- [ ] **Mettre à jour les handlers `handleBulkComplete` et `handleBulkUncomplete` pour accepter `jobVariant`**

```ts
async function handleBulkComplete(section: QuestSectionType, jobVariant?: JobVariant | null) {
  if (!activeCharacterId) return;
  setQuests((prev) =>
    prev.map((q) => {
      if (q.chain.section !== section) return q;
      if (q.chain.job_variant !== null && q.chain.job_variant !== jobVariant) return q;
      return { ...q, is_completed: true };
    })
  );
  try {
    await bulkCompleteSection(supabase, activeCharacterId, dofus.id, section, jobVariant);
  } catch {
    const fresh = await getQuestsForDofus(supabase, dofus.id, activeCharacterId);
    setQuests(fresh);
  }
}

async function handleBulkUncomplete(section: QuestSectionType, jobVariant?: JobVariant | null) {
  if (!activeCharacterId) return;
  setQuests((prev) =>
    prev.map((q) => {
      if (q.chain.section !== section) return q;
      if (q.chain.job_variant !== null && q.chain.job_variant !== jobVariant) return q;
      return { ...q, is_completed: false };
    })
  );
  try {
    await bulkUncompleteSection(supabase, activeCharacterId, dofus.id, section, jobVariant);
  } catch {
    const fresh = await getQuestsForDofus(supabase, dofus.id, activeCharacterId);
    setQuests(fresh);
  }
}
```

- [ ] **Ajouter le sélecteur de métier dans le JSX**

Dans la section alignement (le `<div className="rounded-lg border ...">` qui contient le sélecteur d'alignement), ajouter le sélecteur de métier juste après la fermeture `</div>` de ce bloc, de manière conditionnelle :

```tsx
{hasJobVariant && (
  <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
    <p className="text-sm font-medium text-gray-300">Métier</p>
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => handleJobChange(selectedJob === "paysan" ? null : "paysan")}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          selectedJob === "paysan"
            ? "bg-yellow-600 text-white"
            : "bg-white/10 text-gray-400 hover:bg-white/20"
        }`}
      >
        Paysan
      </button>
      <button
        onClick={() => handleJobChange(selectedJob === "alchimiste" ? null : "alchimiste")}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          selectedJob === "alchimiste"
            ? "bg-green-600 text-white"
            : "bg-white/10 text-gray-400 hover:bg-white/20"
        }`}
      >
        Alchimiste
      </button>
    </div>
    {!selectedJob && (
      <p className="text-xs text-gray-500">Sélectionne ton métier pour voir les quêtes correspondantes.</p>
    )}
  </div>
)}
```

- [ ] **Vérifier la compilation**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Commit**

```bash
git add apps/web/components/dofus/DofusDetailClient.tsx
git commit -m "feat(web): add job variant selector (alchimiste/paysan) for DDG"
```

---

## Task 7 — Sync + vérification finale

- [ ] **Lancer le sync pour appliquer les changes en base**

```bash
cd packages/sync && npm run start
```

Expected: output similaire à :
```
📦 Fetching Apps Script data...
⚙️  Syncing quests, chains, and resources...
✅ Sync complete: X quests, Y resources
```
Aucune erreur `❌`.

- [ ] **Vérifier en base que les quêtes alchimiste existent pour DDG**

Dans Supabase Studio → SQL Editor :

```sql
SELECT q.name, c.job_variant, c.order_index, c.section
FROM dofus_quest_chains c
JOIN quests q ON q.id = c.quest_id
JOIN dofus d ON d.id = c.dofus_id
WHERE d.slug = 'dofus-des-glaces'
  AND c.job_variant IS NOT NULL
ORDER BY c.order_index;
```

Expected: 20 lignes (10 paysan + 10 alchimiste), chaque paire ayant le même `order_index`.

- [ ] **Vérifier en UI**

1. Ouvrir `http://localhost:3000/dofus/dofus-des-glaces`
2. Un bloc "Métier" apparaît avec les boutons **Paysan** / **Alchimiste**
3. Sans sélection : un message "Sélectionne ton métier..." s'affiche et les quêtes métier sont masquées
4. Sélectionner **Paysan** : les 10 quêtes paysan apparaissent aux bonnes positions, les alchimiste sont masquées
5. Sélectionner **Alchimiste** : les 10 quêtes alchimiste apparaissent aux mêmes positions, les paysan sont masquées
6. "Tout cocher" ne coche que les quêtes du métier sélectionné (pas l'autre variant)
7. Recharger la page : le choix de métier est mémorisé (localStorage)

- [ ] **Commit final**

```bash
git add -p  # vérifier qu'il n'y a rien d'indésirable
git commit -m "feat: job variant alchimiste/paysan fully integrated for DDG"
```
