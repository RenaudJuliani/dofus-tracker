# Design — Job Variant (Alchimiste / Paysan) pour le DDG

**Date :** 2026-04-06
**Scope :** Dofus des Glaces uniquement

---

## Contexte

Le DDG contient 10 paires de quêtes mutuellement exclusives selon le métier du personnage :
- Si le joueur est **Paysan**, il fait les 10 quêtes paysan
- Si le joueur est **Alchimiste**, il fait les 10 quêtes alchimiste correspondantes

Ces paires sont dispersées dans l'ordre global des quêtes DDG. Chaque quête paysan est déjà présente en DB avec le bon `order_index`. Les quêtes alchimiste peuvent exister ou non — si elles existent, elles héritent du même `order_index` que leur paysan correspondant ; sinon elles sont créées avec cet `order_index`.

---

## Paires alchimiste / paysan (ordre de correspondance)

| # | Alchimiste | Paysan |
|---|---|---|
| 1 | Cent Vingt trois fleurs | En semant, se ment |
| 2 | Botanique-nique-nique | Pomdeupin vaut mieux que trois tu l'auras |
| 3 | A fleur de peau | Massacre au hakapik |
| 4 | Mes lys fleurs | Mettre son grain de sel |
| 5 | Rose a lys, rose a lys, oh ! | Mauvaise graine |
| 6 | Fleuris mais rougissent | Champ pomy |
| 7 | Heureux qui comme les lys | Gant graine |
| 8 | Le nom de la mycose | Les graines de la discorde |
| 9 | Crocs n'en bourrent | Le champ des heros |
| 10 | Ville fleurie | Champ borde le chateau |

---

## Changements

### 1. Migration DB
```sql
ALTER TABLE dofus_quest_chains
  ADD COLUMN job_variant TEXT CHECK (job_variant IN ('alchimiste', 'paysan'));
```

### 2. Types (`packages/types/src/index.ts`)
- Nouveau type exporté : `JobVariant = "alchimiste" | "paysan"`
- Champ ajouté à `QuestChain` : `job_variant: JobVariant | null`

### 3. Sync — `packages/sync/src/job-variant-overrides.ts`
Nouveau fichier listant les paires alchimiste/paysan pour le DDG.  
Structure : tableau de `{ dofusSlug, pairs: [{ alchimiste: questName, paysan: questName }] }`.

Fonctions exportées :
- `getJobVariantOverride(dofusSlug, questSlug): "alchimiste" | "paysan" | null`
- `getJobVariantPairs(dofusSlug): Array<{ alchimiste: string, paysan: string }>` — utilisé pour lier les `order_index`

### 4. Sync — `sync-apps-script-upsert.ts`
Après le traitement normal de la Sheet :

1. **Appliquer `job_variant` aux quêtes présentes dans la Sheet** : lors de l'upsert de chaque chaîne, lire `getJobVariantOverride` et setter `job_variant`.

2. **Traiter les quêtes alchimiste manquantes** : pour chaque paire du DDG :
   - Chercher le `quest_id` de la quête paysan (déjà en DB)
   - Récupérer son `order_index` pour ce dofus
   - Chercher le `quest_id` de la quête alchimiste en DB (par slug)
   - Si la quête alchimiste n'existe pas dans `quests` : créer l'entrée dans `quests` d'abord
   - Upsert la chaîne alchimiste avec le même `order_index`, même `section`, même `sub_section` que le paysan correspondant, et `job_variant = "alchimiste"`
   - Ajouter les deux quest_ids à `upsertedQuestIds` pour les protéger du stale cleanup

3. **Appliquer `job_variant = "paysan"` aux quêtes paysan** (elles sont dans la Sheet donc traitées à l'étape 1).

### 5. DB Query (`packages/db/src/queries/quests.ts`)
Inclure `job_variant` dans le mapping de `QuestChain` retourné par `getQuestsForDofus`.

### 6. UI — `DofusDetailClient.tsx`
- `hasJobVariant` : `quests.some(q => q.chain.job_variant !== null)`
- `selectedJob: JobVariant | null` en état, persisté en `localStorage` (clé : `job_variant_${dofus.id}_${characterId}`)
- Sélecteur affiché sous l'alignement quand `hasJobVariant`, avec deux boutons : **Paysan** / **Alchimiste**
- `isQuestVisible` : si `q.chain.job_variant !== null`, visible seulement si `q.chain.job_variant === selectedJob`

---

## Comportement attendu

| Sélection | Quêtes affichées |
|---|---|
| Aucun métier | Quêtes paysan ET alchimiste masquées (message : choisir un métier) |
| Paysan | Quêtes communes + 10 quêtes paysan à leurs positions |
| Alchimiste | Quêtes communes + 10 quêtes alchimiste aux mêmes positions |

---

## Bulk complete

`bulkCompleteSection` et `bulkUncompleteSection` agissent sur toutes les quêtes d'une section. Il faut les filtrer pour n'agir que sur les quêtes visibles (job_variant correspondant au métier sélectionné ou null). Les fonctions DB devront accepter un paramètre `jobVariant` optionnel.

---

## Points d'attention

- Le `order_index` de l'alchimiste = celui du paysan correspondant → les deux quêtes cohabitent à la même position, l'UI n'en affiche qu'une
- Si une quête alchimiste n'existe pas dans la Sheet DDG, elle est créée avec les métadonnées copiées depuis la paire paysan
- La sélection de métier est indépendante de la sélection d'alignement
