# Quest Search — Design Spec

**Date:** 2026-04-09

## Overview

Two independent search features: a global quest search on the dofus home page, and a per-dofus quest filter on the detail page. Both work on web and mobile.

---

## 1. Per-Dofus Search (detail page)

**Purpose:** Filter the quest list on a specific dofus detail page by quest name.

**Behaviour:**
- Text input appears above the quest sections.
- Filtering is client-side only — quests are already loaded in memory (`visibleQuests` state).
- Sections with zero matching quests are hidden.
- Collapsed sections that contain a match are automatically expanded.
- Clearing the input restores the full list.

**Web:** input added in `DofusDetailClient.tsx` above the `allGroups.map(...)` render.

**Mobile:** input added in `apps/mobile/app/dofus/[slug].tsx` above the quest sections render.

---

## 2. Global Search (home page)

**Purpose:** Search quests by name across all dofus from the home page.

### UI

- A search bar sits above the dofus grid on both web and mobile.
- When the query is empty the grid renders normally.
- When the user types, the grid is replaced by a results list.
- Each result row shows:
  - Quest name (with matching substring highlighted)
  - Sub-section label (e.g. "Prérequis", "Les quêtes")
  - Dofus egg badge: the dofus `image_url` (or color circle fallback) + dofus name
- Quests shared between multiple dofus produce one result per dofus, each with its own badge.
- An empty-state message is shown when no results match.

### Navigation

Clicking a result navigates to `/dofus/[slug]?highlight=[questSlug]`.

On the detail page, when `highlight` is present in the URL:
- The page scrolls the matching quest into view on mount.
- The quest row renders with a highlighted border (dofus color glow) for 2 seconds, then fades.

### Data

New function in `packages/db/src/queries/quests.ts`:

```ts
searchQuests(
  supabase: SupabaseClient,
  query: string          // min 2 chars before querying
): Promise<QuestSearchResult[]>
```

Query: join `quests` + `dofus_quest_chains` + `dofus`, filter `quests.name ILIKE '%query%'`, return one row per (quest, dofus) pair.

```ts
interface QuestSearchResult {
  quest_id: string;
  quest_name: string;
  quest_slug: string;
  sub_section: string | null;
  dofus_id: string;
  dofus_name: string;
  dofus_slug: string;
  dofus_color: string;
  dofus_image_url: string | null;
}
```

Debounce: 300 ms. Minimum query length: 2 characters.

### Type addition

Add `QuestSearchResult` to `packages/types/src/index.ts`.

---

## 3. Components

| Component | Location | Purpose |
|---|---|---|
| `QuestSearchBar` | `packages/ui` or each app | Reusable input (web + mobile variants) |
| `QuestSearchResults` | `apps/web/components/home/` | Results list (web) |
| `QuestSearchResults` | `apps/mobile/components/home/` | Results list (mobile) |

Given the web/mobile styling divergence, separate `QuestSearchResults` implementations per app are cleaner than a shared component. The `searchQuests` DB query is shared.

---

## 4. Highlight mechanic (detail page)

- Read `highlight` param from URL on mount (`useSearchParams` on web, `useLocalSearchParams` on mobile).
- Find the matching quest in `visibleQuests`.
- Scroll it into view (`scrollIntoView` on web, `scrollTo` / `ref.measure` on mobile).
- Apply a highlighted style for 2 s, then remove it.
- If the quest is in a collapsed section, expand that section first.

---

## 5. Out of scope

- Search history / saved searches
- Filtering by completion status in global search
- Server-side rendering of search results (client-side fetch is sufficient)
