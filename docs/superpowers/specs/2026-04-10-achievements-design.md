# Succès (Achievements) — Design Spec

**Date :** 2026-04-10  
**Statut :** Validé

---

## Contexte

DofusDB expose 291 succès liés aux quêtes, groupés en 32 sous-catégories (Frigost ×48, Quêtes principales ×43, Dimensions Divines ×26, etc.). Chaque succès a des objectifs qui correspondent à des noms de quêtes, des points, un level requis, et des récompenses (XP, Kamas, Items).

L'objectif est d'intégrer ces succès dans le tracker en permettant :
1. Une **progression automatique** déduite des quêtes déjà cochées par le personnage
2. Une **progression manuelle** depuis l'UI succès pour les objectifs non couverts par le tracker

Les succès évoluent avec les mises à jour du jeu (nouveaux succès ajoutés) → le système doit supporter des syncs répétées sans effets de bord.

---

## Schéma de données

### Nouvelles tables

```sql
-- Les succès (mis à jour via sync, id DofusDB stable)
CREATE TABLE achievements (
  id               integer PRIMARY KEY,  -- id DofusDB
  name             text NOT NULL,
  description      text NOT NULL,
  points           integer NOT NULL,
  level_required   integer NOT NULL DEFAULT 0,
  subcategory_id   integer NOT NULL,
  subcategory_name text NOT NULL,
  order_index      integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Les objectifs de chaque succès
CREATE TABLE achievement_objectives (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id integer NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  order_index    integer NOT NULL,
  description    text NOT NULL,         -- nom brut DofusDB
  quest_id       uuid REFERENCES quests(id) ON DELETE SET NULL  -- NULL si pas de quête matchée
);

-- Completions manuelles (cochées depuis l'UI succès)
CREATE TABLE achievement_objective_completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES achievement_objectives(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(character_id, objective_id)
);

CREATE INDEX ON achievement_objectives(achievement_id);
CREATE INDEX ON achievement_objective_completions(character_id);
```

### Logique de progression par objectif

Un objectif est considéré **complété** si l'une des conditions suivantes est vraie :

- **Auto** : `quest_id IS NOT NULL` ET une entrée existe dans `user_quest_completions(character_id, quest_id)`
- **Manuel** : une entrée existe dans `achievement_objective_completions(character_id, objective_id)`

Les deux états sont distincts dans l'UI (visuel différent : bleu/auto vs vert/manuel).

### Interaction croisée

**Objectif avec `quest_id` renseigné :**
- Cocher depuis les succès → insère dans `user_quest_completions` (source de vérité unique). L'objectif passe immédiatement en état "auto" (bleu, non cliquable).
- Pour décocher, l'utilisateur doit aller décocher la quête dans le tracker Dofus — pas depuis les succès.

**Objectif sans `quest_id` (ex : "Alignement 10") :**
- Cocher depuis les succès → insère uniquement dans `achievement_objective_completions`.
- Décocher → supprime de `achievement_objective_completions`.

**Règle générale :** les objectifs en état "auto" (checkbox bleue) ne sont jamais cliquables depuis les succès.

---

## Script de sync

**Commande :** `pnpm sync:achievements`  
**Fichier :** `apps/sync/src/sync-achievements.ts`

### Algorithme

1. Lit `dofusdb_quetes.json` (local) — prévu pour basculer vers `https://api.dofusdb.fr` si besoin
2. `UPSERT` dans `achievements` par `id` (`ON CONFLICT id DO UPDATE`)
3. Pour chaque objectif :
   - Normalisation : `.toLowerCase().replace(/['']/g, "'").trim()`
   - Tentative de match exact sur `quests.name` normalisé
   - `UPSERT` dans `achievement_objectives` avec `quest_id` renseigné ou `NULL`
   - Un `quest_id` déjà renseigné n'est **pas** écrasé lors des syncs suivantes
4. Log final : `X achievements upserted, Y objectives matched, Z unmatched`

### Idempotence

- Re-exécutable sans effets de bord
- Les nouvelles mises à jour du jeu (nouveaux succès) sont insérés automatiquement
- Les `achievement_objective_completions` existantes sont préservées

---

## UI Web

### Route : `/achievements`

**URL state :** `?cat=<subcategory_id>` — catégorie sélectionnée dans le query param (partageable)

**Layout :**

```
┌─────────────────────────────────────────────────────────┐
│ 🏆 Succès                              ⭐ 420 / 2910 pts │
├──────────────┬──────────────────────────────────────────┤
│ SIDEBAR      │ 🔍 Rechercher un succès…                  │
│              ├──────────────────────────────────────────┤
│ Frigost 12/48│ ▌ Les mystères de Frigost   ✅ 5/5   [30] │
│ Principales… │ ▌ La vengeance de Sylargh  🔶 3/6   [20] │
│ Dimensions…  │   ↳ objectifs + récompenses (expandé)    │
│ Alignement…  │ ▌ Roi des glaces           ⬜ 0/4   [10] │
│ …            │ ▌ L'île à la dérive        ⬜ 0/5   [40] │
└──────────────┴──────────────────────────────────────────┘
```

**Sidebar :**
- 32 sous-catégories, chacune avec badge `X/N` et mini barre de progression
- Sélection persistée dans l'URL

**Liste des succès :**
- Barre colorée gauche : vert (100% complété) / orange (partiel) / gris (0%)
- Ligne : icône placeholder · nom · description · `X/N objectifs` · badge points
- Barre de recherche filtre en live par nom

**Détail (accordion inline) :**
- Clic sur une row → expand / collapse
- Objectifs avec 3 états visuels :
  - Checkbox bleue cochée + texte barré = **auto** (non cliquable)
  - Checkbox verte cochée = **manuel**
  - Checkbox vide = **non complété** (cliquable)
- Récompenses : XP · Kamas · Items (affichés si > 0)

**State management :**
- Personnage actif via `characterStore` (Zustand existant)
- Pattern server component + client interactivity (cohérent avec l'existant)
- Pas de nouveau store

---

## UI Mobile (Expo)

### Nouveau tab dans la bottom tab bar : "Succès"

**Screen 1 — `AchievementCategoriesScreen`**
- Header : "Succès" + total points du personnage actif
- `FlatList` des 32 sous-catégories : nom · badge `X/N` · barre de progression · chevron `›`
- Tap → navigate vers Screen 2 avec `subcategoryId` + `subcategoryName`

**Screen 2 — `AchievementListScreen`**
- Header : nom de la catégorie + bouton retour
- Barre de recherche (filtre local)
- `FlatList` des succès : icône · nom · `X/N` · badge points · barre colorée gauche
- Tap → ouvre le Bottom Sheet

**`AchievementBottomSheet`**
- Basé sur `react-native-reanimated` (déjà installé)
- Handle + titre + badge points
- `ScrollView` : objectifs avec checkboxes (même logique auto/manuel que web) + récompenses
- Fermeture : swipe down ou tap backdrop

**Réutilisation :**
- `characterStore` Zustand partagé via `packages/`
- Queries Supabase dans `packages/db` (même pattern que `getQuestsForDofus`)
- Offline : achievements mis en cache (React Query), completions sync à la reconnexion

---

## Tests

- **Unit :** logique de normalisation du matching `name → quest_id` dans le script de sync
- **Integration :** `getAchievementsForCharacter(characterId, subcategoryId)` — vérifie la fusion auto + manuel
- **Composant web :** rendu de la liste, expand accordion, état des checkboxes
- Pas de test E2E pour l'instant (cohérent avec l'existant)

---

## Hors scope

- Import des icônes DofusDB (placeholder générique utilisé)
- Achievements non liés aux quêtes (combats, crafts, etc.)
- Notifications push mobile quand un succès est débloqué
