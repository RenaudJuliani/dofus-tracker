# Plan 1 — Foundation & Sync

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Turborepo monorepo, define all shared TypeScript types, create the Supabase schema + RLS + progress view, build the `packages/db` query layer, and ship the Google Sheets → Supabase sync CLI.

**Architecture:** Turborepo monorepo with pnpm workspaces. `packages/types` is the single source of truth for TypeScript interfaces — all other packages import from it. `packages/db` wraps every Supabase query behind typed functions. `packages/sync` is a standalone CLI script that reads the Google Sheet via a service account and upserts data into Supabase using the service-role key (bypasses RLS).

**Tech Stack:** pnpm 9, Turborepo 2, TypeScript 5.4, Supabase CLI, @supabase/supabase-js 2, googleapis 140, vitest 1.6, tsx

---

## File Map

```
dofus-tracker/
├── package.json                              ← root workspace
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .gitignore
├── .env.example
├── supabase/
│   ├── config.toml                           ← created by `supabase init`
│   ├── migrations/
│   │   ├── 20240401000001_initial_schema.sql ← all 7 tables + indexes
│   │   ├── 20240401000002_rls_policies.sql   ← RLS on user-owned tables
│   │   └── 20240401000003_progress_view.sql  ← v_dofus_progress view
│   └── seed.sql                              ← seed data for local dev
├── packages/
│   ├── types/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts                      ← all shared TS interfaces
│   ├── db/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── client.ts                     ← Supabase client factory
│   │       ├── index.ts                      ← re-exports
│   │       └── queries/
│   │           ├── dofus.ts                  ← getDofusList, getDofusById, getDofusProgressForCharacter
│   │           ├── characters.ts             ← getCharacters, createCharacter, deleteCharacter
│   │           ├── quests.ts                 ← getQuestsForDofus, toggleQuestCompletion, bulkCompleteSection
│   │           └── resources.ts              ← getResourcesForDofus
│   └── sync/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── src/
│           ├── index.ts                      ← CLI entry point
│           ├── sheets-client.ts              ← Google Sheets API wrapper
│           ├── upsert.ts                     ← Supabase upsert logic
│           ├── parsers/
│           │   ├── quest-row-parser.ts       ← one sheet row → ParsedQuestRow | null
│           │   ├── resource-parser.ts        ← resource columns → ParsedResourceRow[]
│           │   └── group-detector.ts         ← assign group_id UUIDs from group markers
│           └── __tests__/
│               ├── quest-row-parser.test.ts
│               ├── resource-parser.test.ts
│               └── group-detector.test.ts
```

---

### Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Create the root `package.json`**

```json
{
  "name": "dofus-tracker",
  "private": true,
  "packageManager": "pnpm@9.1.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "sync": "pnpm --filter @dofus-tracker/sync run start"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
.env
.env.local
.turbo/
.next/
.expo/
service-account.json
supabase/.branches/
supabase/.temp/
```

- [ ] **Step 6: Create `.env.example`**

```
# Supabase (get from your project dashboard at supabase.com)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Sheets sync (for packages/sync only)
GOOGLE_SHEET_ID=1abc...xyz
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account.json
```

- [ ] **Step 7: Create placeholder app dirs and install deps**

```bash
mkdir -p apps/web apps/mobile
pnpm install
```

Expected output: `Lockfile is up to date, resolution step is skipped`

- [ ] **Step 8: Commit**

```bash
git init
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .gitignore .env.example
git commit -m "chore: monorepo scaffold (pnpm + turborepo)"
```

---

### Task 2: `packages/types`

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/index.ts`

- [ ] **Step 1: Create `packages/types/package.json`**

```json
{
  "name": "@dofus-tracker/types",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create `packages/types/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/types/src/index.ts`**

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
  order_index: number;
  group_id: string | null;
  quest_types: QuestType[];
  combat_count: number | null;
  is_avoidable: boolean;
}

export interface Resource {
  id: string;
  name: string;
  icon_emoji: string;
  dofus_id: string;
  quantity_per_character: number;
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
  class: string;
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

/** Quest enriched with chain metadata + completion status for a given character */
export interface QuestWithChain extends Quest {
  chain: DofusQuestChain;
  is_completed: boolean;
  /** IDs of other Dofus that also require this quest */
  shared_dofus_ids: string[];
}

/** Dofus enriched with quest lists + resources for the detail page */
export interface DofusDetail extends Dofus {
  prerequisites: QuestWithChain[];
  main_quests: QuestWithChain[];
  resources: Resource[];
  progress: { completed: number; total: number };
}
```

- [ ] **Step 4: Build and verify types compile**

```bash
pnpm --filter @dofus-tracker/types build
```

Expected: `tsc` exits 0, `packages/types/dist/` is created.

- [ ] **Step 5: Commit**

```bash
git add packages/types/
git commit -m "feat: add shared TypeScript types package"
```

---

### Task 3: Supabase Schema + RLS + Progress View

**Files:**
- Create: `supabase/migrations/20240401000001_initial_schema.sql`
- Create: `supabase/migrations/20240401000002_rls_policies.sql`
- Create: `supabase/migrations/20240401000003_progress_view.sql`
- Create: `supabase/seed.sql`

**Prerequisite:** Install Supabase CLI once: `brew install supabase/tap/supabase`

- [ ] **Step 1: Initialize Supabase**

```bash
supabase init
```

Expected: `supabase/config.toml` is created.

- [ ] **Step 2: Create migration 001 — initial schema**

Create `supabase/migrations/20240401000001_initial_schema.sql`:

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Dofus items (one row per Dofus in the game)
CREATE TABLE dofus (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('primordial', 'secondaire')),
  color text NOT NULL DEFAULT '#4ade80',
  description text NOT NULL DEFAULT '',
  recommended_level integer NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Quests — shared across Dofus (one row per unique quest)
CREATE TABLE quests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  dofuspourlesnoobs_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Dofus ↔ Quest relation with ordering and quest metadata
CREATE TABLE dofus_quest_chains (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dofus_id uuid NOT NULL REFERENCES dofus(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('prerequisite', 'main')),
  order_index integer NOT NULL,
  group_id uuid,
  quest_types text[] NOT NULL DEFAULT '{}',
  combat_count integer,
  is_avoidable boolean NOT NULL DEFAULT false,
  UNIQUE(dofus_id, quest_id)
);

-- Resources required to complete a Dofus
CREATE TABLE resources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  icon_emoji text NOT NULL DEFAULT '📦',
  dofus_id uuid NOT NULL REFERENCES dofus(id) ON DELETE CASCADE,
  quantity_per_character integer NOT NULL DEFAULT 1,
  is_kamas boolean NOT NULL DEFAULT false
);

-- User profiles (one per auth.users row, created on signup)
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Characters — multiple per account, progression is per character
CREATE TABLE characters (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  class text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Quest completions — per character, per quest (NOT per dofus)
-- Checking a quest here marks it complete for ALL dofus that require it
CREATE TABLE user_quest_completions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(character_id, quest_id)
);

-- Indexes for common query patterns
CREATE INDEX ON dofus_quest_chains(dofus_id);
CREATE INDEX ON dofus_quest_chains(quest_id);
CREATE INDEX ON user_quest_completions(character_id);
CREATE INDEX ON user_quest_completions(quest_id);
CREATE INDEX ON characters(user_id);
```

- [ ] **Step 3: Create migration 002 — RLS policies**

Create `supabase/migrations/20240401000002_rls_policies.sql`:

```sql
-- Enable RLS on all user-owned tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quest_completions ENABLE ROW LEVEL SECURITY;

-- user_profiles: readable by anyone, writable only by owner
CREATE POLICY "Profiles are publicly viewable" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- characters: only visible/editable by the owning user
CREATE POLICY "Users can view own characters" ON characters
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own characters" ON characters
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own characters" ON characters
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own characters" ON characters
  FOR DELETE USING (user_id = auth.uid());

-- user_quest_completions: scoped to characters owned by the requesting user
CREATE POLICY "Users can view own completions" ON user_quest_completions
  FOR SELECT USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own completions" ON user_quest_completions
  FOR INSERT WITH CHECK (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own completions" ON user_quest_completions
  FOR DELETE USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );

-- dofus, quests, dofus_quest_chains, resources are public read-only
-- Writes are done only by the admin via the service role key (bypasses RLS)
```

- [ ] **Step 4: Create migration 003 — progress view**

Create `supabase/migrations/20240401000003_progress_view.sql`:

```sql
-- security_invoker = true means the view respects the caller's RLS policies
-- (characters visible only to their owner, completions scoped accordingly)
CREATE OR REPLACE VIEW v_dofus_progress WITH (security_invoker = true) AS
SELECT
  c.id AS character_id,
  c.user_id,
  c.name AS character_name,
  d.id AS dofus_id,
  d.name AS dofus_name,
  COUNT(dqc.quest_id) AS total_quests,
  COUNT(uqc.quest_id) AS completed_quests,
  ROUND(
    COUNT(uqc.quest_id)::numeric / NULLIF(COUNT(dqc.quest_id), 0) * 100
  ) AS progress_pct
FROM dofus d
JOIN dofus_quest_chains dqc ON dqc.dofus_id = d.id
CROSS JOIN characters c
LEFT JOIN user_quest_completions uqc
  ON uqc.quest_id = dqc.quest_id AND uqc.character_id = c.id
GROUP BY c.id, c.user_id, c.name, d.id, d.name;
```

- [ ] **Step 5: Create seed data for local development**

Create `supabase/seed.sql`:

```sql
-- Seed two Dofus for local testing
INSERT INTO dofus (id, name, slug, type, color, description, recommended_level)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dofus Émeraude', 'emeraude', 'primordial', '#22c55e', 'L''œuf légendaire des dragons émeraude.', 80),
  ('00000000-0000-0000-0000-000000000002', 'Dofus Ocre', 'ocre', 'primordial', '#f59e0b', 'L''œuf mythique convoité par tous.', 150)
ON CONFLICT (slug) DO NOTHING;

-- Seed quests (shared across Dofus)
INSERT INTO quests (id, name, slug, dofuspourlesnoobs_url)
VALUES
  ('00000000-0000-0000-0001-000000000001', 'La Quête de Kwisatz', 'la-quete-de-kwisatz', 'https://dofuspourlesnoobs.com/quete-de-kwisatz.html'),
  ('00000000-0000-0000-0001-000000000002', 'L''Héritage des Dragons', 'heritage-des-dragons', 'https://dofuspourlesnoobs.com/heritage-des-dragons.html')
ON CONFLICT (slug) DO NOTHING;

-- Seed quest chains for Dofus Émeraude
INSERT INTO dofus_quest_chains (dofus_id, quest_id, section, order_index, quest_types)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 'prerequisite', 1, ARRAY['combat_solo']),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 'main', 1, ARRAY['donjon'])
ON CONFLICT (dofus_id, quest_id) DO NOTHING;

-- Seed resources (plain INSERT — seed only runs on fresh DB via supabase db reset)
INSERT INTO resources (name, icon_emoji, dofus_id, quantity_per_character, is_kamas)
VALUES
  ('Écaille de Dragon Émeraude', '🐉', '00000000-0000-0000-0000-000000000001', 100, false),
  ('Kamas', '💰', '00000000-0000-0000-0000-000000000001', 1000000, true);
```

- [ ] **Step 6: Start local Supabase and apply migrations**

```bash
supabase start
supabase db reset
```

Expected: Migrations applied, seed data inserted. Supabase Studio at `http://localhost:54323`.

- [ ] **Step 7: Verify schema in Supabase Studio**

Open `http://localhost:54323` → Table Editor. Confirm these tables exist:
`dofus`, `quests`, `dofus_quest_chains`, `resources`, `user_profiles`, `characters`, `user_quest_completions`

Also confirm the view in SQL editor:
```sql
SELECT * FROM v_dofus_progress;
```
Expected: 0 rows (no characters yet — that's correct).

- [ ] **Step 8: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase schema, RLS policies, and progress view"
```

---

### Task 4: `packages/db`

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/queries/dofus.ts`
- Create: `packages/db/src/queries/characters.ts`
- Create: `packages/db/src/queries/quests.ts`
- Create: `packages/db/src/queries/resources.ts`
- Create: `packages/db/src/index.ts`

- [ ] **Step 1: Create `packages/db/package.json`**

```json
{
  "name": "@dofus-tracker/db",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@dofus-tracker/types": "workspace:*",
    "@supabase/supabase-js": "^2.43.4"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create `packages/db/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/db/src/client.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient(url: string, key: string) {
  return createClient(url, key);
}

export type SupabaseClient = ReturnType<typeof createSupabaseClient>;
```

- [ ] **Step 4: Create `packages/db/src/queries/dofus.ts`**

```typescript
import type { SupabaseClient } from "../client.js";
import type { Dofus, DofusProgress } from "@dofus-tracker/types";

export async function getDofusList(client: SupabaseClient): Promise<Dofus[]> {
  const { data, error } = await client
    .from("dofus")
    .select("*")
    .order("type", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getDofusById(
  client: SupabaseClient,
  id: string
): Promise<Dofus | null> {
  const { data, error } = await client
    .from("dofus")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

export async function getDofusBySlug(
  client: SupabaseClient,
  slug: string
): Promise<Dofus | null> {
  const { data, error } = await client
    .from("dofus")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

export async function getDofusProgressForCharacter(
  client: SupabaseClient,
  characterId: string
): Promise<DofusProgress[]> {
  const { data, error } = await client
    .from("v_dofus_progress")
    .select("*")
    .eq("character_id", characterId);
  if (error) throw error;
  return (data ?? []) as DofusProgress[];
}
```

- [ ] **Step 5: Create `packages/db/src/queries/characters.ts`**

```typescript
import type { SupabaseClient } from "../client.js";
import type { Character } from "@dofus-tracker/types";

export async function getCharacters(
  client: SupabaseClient,
  userId: string
): Promise<Character[]> {
  const { data, error } = await client
    .from("characters")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCharacter(
  client: SupabaseClient,
  userId: string,
  name: string,
  characterClass: string
): Promise<Character> {
  const { data, error } = await client
    .from("characters")
    .insert({ user_id: userId, name, class: characterClass })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCharacter(
  client: SupabaseClient,
  characterId: string
): Promise<void> {
  const { error } = await client
    .from("characters")
    .delete()
    .eq("id", characterId);
  if (error) throw error;
}
```

- [ ] **Step 6: Create `packages/db/src/queries/quests.ts`**

```typescript
import type { SupabaseClient } from "../client.js";
import type { QuestWithChain, QuestSection } from "@dofus-tracker/types";

export async function getQuestsForDofus(
  client: SupabaseClient,
  dofusId: string,
  characterId: string
): Promise<QuestWithChain[]> {
  // Fetch chains joined with quest data
  const { data: chains, error: chainsError } = await client
    .from("dofus_quest_chains")
    .select(`*, quest:quests(*)`)
    .eq("dofus_id", dofusId)
    .order("section", { ascending: true })
    .order("order_index", { ascending: true });
  if (chainsError) throw chainsError;
  if (!chains || chains.length === 0) return [];

  const questIds = chains.map((c) => c.quest_id);

  // Fetch which quests this character has completed
  const { data: completions, error: completionsError } = await client
    .from("user_quest_completions")
    .select("quest_id")
    .eq("character_id", characterId)
    .in("quest_id", questIds);
  if (completionsError) throw completionsError;
  const completedSet = new Set((completions ?? []).map((c) => c.quest_id));

  // Fetch other Dofus that share these quests (for the cross-dofus badge)
  const { data: allChains, error: allChainsError } = await client
    .from("dofus_quest_chains")
    .select("quest_id, dofus_id")
    .in("quest_id", questIds)
    .neq("dofus_id", dofusId);
  if (allChainsError) throw allChainsError;

  const sharedMap = new Map<string, string[]>();
  for (const c of allChains ?? []) {
    const existing = sharedMap.get(c.quest_id) ?? [];
    sharedMap.set(c.quest_id, [...existing, c.dofus_id]);
  }

  return chains.map((c) => ({
    // Spread the quest row fields (id, name, slug, dofuspourlesnoobs_url, created_at)
    ...c.quest,
    chain: {
      id: c.id,
      dofus_id: c.dofus_id,
      quest_id: c.quest_id,
      section: c.section as QuestSection,
      order_index: c.order_index,
      group_id: c.group_id,
      quest_types: c.quest_types,
      combat_count: c.combat_count,
      is_avoidable: c.is_avoidable,
    },
    is_completed: completedSet.has(c.quest_id),
    shared_dofus_ids: sharedMap.get(c.quest_id) ?? [],
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
    // Ignore "already exists" (duplicate key = already completed)
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

- [ ] **Step 7: Create `packages/db/src/queries/resources.ts`**

```typescript
import type { SupabaseClient } from "../client.js";
import type { Resource } from "@dofus-tracker/types";

export async function getResourcesForDofus(
  client: SupabaseClient,
  dofusId: string
): Promise<Resource[]> {
  const { data, error } = await client
    .from("resources")
    .select("*")
    .eq("dofus_id", dofusId)
    .order("is_kamas", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 8: Create `packages/db/src/index.ts`**

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

export { getResourcesForDofus } from "./queries/resources.js";
```

- [ ] **Step 9: Install deps and build**

```bash
pnpm install
pnpm --filter @dofus-tracker/db build
```

Expected: `packages/db/dist/` created with no TypeScript errors.

- [ ] **Step 10: Commit**

```bash
git add packages/db/
git commit -m "feat: add Supabase query layer (packages/db)"
```

---

### Task 5: `packages/sync` — Parsers (TDD)

**Files:**
- Create: `packages/sync/package.json`
- Create: `packages/sync/tsconfig.json`
- Create: `packages/sync/vitest.config.ts`
- Create: `packages/sync/src/__tests__/quest-row-parser.test.ts`
- Create: `packages/sync/src/parsers/quest-row-parser.ts`
- Create: `packages/sync/src/__tests__/resource-parser.test.ts`
- Create: `packages/sync/src/parsers/resource-parser.ts`
- Create: `packages/sync/src/__tests__/group-detector.test.ts`
- Create: `packages/sync/src/parsers/group-detector.ts`

**Sheet column layout assumed:**
- A: Section ("Prérequis" / "Chaîne principale" / empty = inherit from previous row)
- B: Quest name
- C: dofuspourlesnoobs.com URL
- D: Quest types — comma-separated codes (`combat_solo`, `combat_groupe`, `donjon`, `metier`, `boss`, `succes`, `horaires`)
- E: Group marker — short string shared by quests in the same "faire ensemble" group (empty if none)
- F: Combat count — integer or empty
- G: Is avoidable — "oui" or empty

Resource columns start at column I (index 8):
- I (8): Resource name
- J (9): Icon emoji
- K (10): Quantity per character
- L (11): "kamas" if this row represents the kamas cost

- [ ] **Step 1: Create `packages/sync/package.json`**

```json
{
  "name": "@dofus-tracker/sync",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@dofus-tracker/types": "workspace:*",
    "@supabase/supabase-js": "^2.43.4",
    "googleapis": "^140.0.0"
  },
  "devDependencies": {
    "tsx": "^4.11.2",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `packages/sync/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/sync/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Write failing tests for `quest-row-parser`**

Create `packages/sync/src/__tests__/quest-row-parser.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseQuestRow, type RawSheetRow } from "../parsers/quest-row-parser.js";

describe("parseQuestRow", () => {
  it("parses a simple quest row", () => {
    const row: RawSheetRow = [
      "Prérequis",                                        // A: section
      "La Quête de Kwisatz",                              // B: name
      "https://dofuspourlesnoobs.com/kwisatz.html",       // C: url
      "combat_solo",                                      // D: types
      "",                                                 // E: group marker
      "",                                                 // F: combat count
      "",                                                 // G: avoidable
    ];
    const result = parseQuestRow(row, "Prérequis");
    expect(result).toEqual({
      name: "La Quête de Kwisatz",
      dofuspourlesnoobs_url: "https://dofuspourlesnoobs.com/kwisatz.html",
      section: "prerequisite",
      quest_types: ["combat_solo"],
      group_marker: null,
      combat_count: null,
      is_avoidable: false,
    });
  });

  it("inherits section from previous row when cell is empty", () => {
    const row: RawSheetRow = ["", "Suite de quête", "", "donjon", "", "", ""];
    const result = parseQuestRow(row, "Chaîne principale");
    expect(result?.section).toBe("main");
  });

  it("parses multiple quest types and combat count", () => {
    const row: RawSheetRow = [
      "Chaîne principale",
      "Combat + Donjon",
      "",
      "combat_groupe,donjon",
      "",
      "3",
      "",
    ];
    const result = parseQuestRow(row, "Chaîne principale");
    expect(result?.quest_types).toEqual(["combat_groupe", "donjon"]);
    expect(result?.combat_count).toBe(3);
  });

  it("parses group marker and avoidable flag", () => {
    const row: RawSheetRow = [
      "Chaîne principale",
      "Quête groupée",
      "",
      "combat_solo",
      "A",
      "",
      "oui",
    ];
    const result = parseQuestRow(row, "Chaîne principale");
    expect(result?.group_marker).toBe("A");
    expect(result?.is_avoidable).toBe(true);
  });

  it("returns null for empty rows (headers, separators)", () => {
    const row: RawSheetRow = ["", "", "", "", "", "", ""];
    expect(parseQuestRow(row, "Prérequis")).toBeNull();
  });

  it("maps section labels to section types correctly", () => {
    const prereqRow: RawSheetRow = ["Prérequis", "Q1", "", "succes", "", "", ""];
    const mainRow: RawSheetRow = ["Chaîne principale", "Q2", "", "donjon", "", "", ""];
    expect(parseQuestRow(prereqRow, "Prérequis")?.section).toBe("prerequisite");
    expect(parseQuestRow(mainRow, "Chaîne principale")?.section).toBe("main");
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

```bash
pnpm --filter @dofus-tracker/sync test
```

Expected: FAIL — `Cannot find module '../parsers/quest-row-parser.js'`

- [ ] **Step 6: Implement `quest-row-parser.ts`**

Create `packages/sync/src/parsers/quest-row-parser.ts`:

```typescript
import type { QuestSection, QuestType } from "@dofus-tracker/types";

export type RawSheetRow = string[];

export interface ParsedQuestRow {
  name: string;
  dofuspourlesnoobs_url: string | null;
  section: QuestSection;
  quest_types: QuestType[];
  group_marker: string | null;
  combat_count: number | null;
  is_avoidable: boolean;
}

const SECTION_MAP: Record<string, QuestSection> = {
  "Prérequis": "prerequisite",
  "Chaîne principale": "main",
};

const VALID_QUEST_TYPES = new Set<QuestType>([
  "combat_solo",
  "combat_groupe",
  "donjon",
  "metier",
  "boss",
  "succes",
  "horaires",
]);

export function parseQuestRow(
  row: RawSheetRow,
  previousSection: string
): ParsedQuestRow | null {
  const [sectionCell, name, url, typesCell, groupMarker, combatCountCell, avoidableCell] = row;

  // Skip empty rows (headers, blank separators)
  if (!name?.trim()) return null;

  const rawSection = sectionCell?.trim() || previousSection;
  const section: QuestSection = SECTION_MAP[rawSection] ?? "main";

  const quest_types = (typesCell ?? "")
    .split(",")
    .map((t) => t.trim() as QuestType)
    .filter((t) => VALID_QUEST_TYPES.has(t));

  const combatCountRaw = combatCountCell?.trim();
  const parsed = combatCountRaw ? parseInt(combatCountRaw, 10) : null;
  const combat_count = parsed !== null && !isNaN(parsed) ? parsed : null;

  return {
    name: name.trim(),
    dofuspourlesnoobs_url: url?.trim() || null,
    section,
    quest_types,
    group_marker: groupMarker?.trim() || null,
    combat_count,
    is_avoidable: avoidableCell?.trim().toLowerCase() === "oui",
  };
}
```

- [ ] **Step 7: Run tests — expect pass**

```bash
pnpm --filter @dofus-tracker/sync test
```

Expected: `✓ quest-row-parser.test.ts (6 tests) — all PASS`

- [ ] **Step 8: Write failing tests for `resource-parser`**

Create `packages/sync/src/__tests__/resource-parser.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseResourceRows, type RawSheetRow } from "../parsers/resource-parser.js";

describe("parseResourceRows", () => {
  it("parses a list of resource rows", () => {
    // Columns A-G are quest data (indices 0-6), column H is empty (index 7)
    // Resources start at column I (index 8)
    const rows: RawSheetRow[] = [
      ["", "", "", "", "", "", "", "", "Écaille de Dragon", "🐉", "100", ""],
      ["", "", "", "", "", "", "", "", "Cristal de Sel", "💎", "50", ""],
    ];
    expect(parseResourceRows(rows)).toEqual([
      { name: "Écaille de Dragon", icon_emoji: "🐉", quantity_per_character: 100, is_kamas: false },
      { name: "Cristal de Sel", icon_emoji: "💎", quantity_per_character: 50, is_kamas: false },
    ]);
  });

  it("marks kamas row", () => {
    const rows: RawSheetRow[] = [
      ["", "", "", "", "", "", "", "", "Kamas", "💰", "1000000", "kamas"],
    ];
    expect(parseResourceRows(rows)[0].is_kamas).toBe(true);
  });

  it("uses default emoji when emoji cell is empty", () => {
    const rows: RawSheetRow[] = [
      ["", "", "", "", "", "", "", "", "Ressource", "", "10", ""],
    ];
    expect(parseResourceRows(rows)[0].icon_emoji).toBe("📦");
  });

  it("skips rows with no resource name", () => {
    const rows: RawSheetRow[] = [
      ["", "", "", "", "", "", "", "", "", "", "", ""],
    ];
    expect(parseResourceRows(rows)).toHaveLength(0);
  });
});
```

- [ ] **Step 9: Run test to verify it fails**

```bash
pnpm --filter @dofus-tracker/sync test
```

Expected: FAIL — `Cannot find module '../parsers/resource-parser.js'`

- [ ] **Step 10: Implement `resource-parser.ts`**

Create `packages/sync/src/parsers/resource-parser.ts`:

```typescript
import type { RawSheetRow } from "./quest-row-parser.js";

export type { RawSheetRow };

export interface ParsedResourceRow {
  name: string;
  icon_emoji: string;
  quantity_per_character: number;
  is_kamas: boolean;
}

// Resource columns start at index 8 (column I, 0-based)
const COL_NAME = 8;
const COL_EMOJI = 9;
const COL_QTY = 10;
const COL_KAMAS = 11;

export function parseResourceRows(rows: RawSheetRow[]): ParsedResourceRow[] {
  const results: ParsedResourceRow[] = [];

  for (const row of rows) {
    const name = row[COL_NAME]?.trim();
    if (!name) continue;

    const icon_emoji = row[COL_EMOJI]?.trim() || "📦";
    const qtyRaw = row[COL_QTY]?.trim().replace(/\s/g, "");
    const qty = qtyRaw ? parseInt(qtyRaw, 10) : 1;

    results.push({
      name,
      icon_emoji,
      quantity_per_character: isNaN(qty) ? 1 : qty,
      is_kamas: row[COL_KAMAS]?.trim().toLowerCase() === "kamas",
    });
  }

  return results;
}
```

- [ ] **Step 11: Run tests — expect pass**

```bash
pnpm --filter @dofus-tracker/sync test
```

Expected: `✓ resource-parser.test.ts (4 tests) — all PASS`

- [ ] **Step 12: Write failing tests for `group-detector`**

Create `packages/sync/src/__tests__/group-detector.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { assignGroupIds } from "../parsers/group-detector.js";
import type { ParsedQuestRow } from "../parsers/quest-row-parser.js";

function makeRow(overrides: Partial<ParsedQuestRow> = {}): ParsedQuestRow {
  return {
    name: "Quest",
    dofuspourlesnoobs_url: null,
    section: "main",
    quest_types: [],
    group_marker: null,
    combat_count: null,
    is_avoidable: false,
    ...overrides,
  };
}

describe("assignGroupIds", () => {
  it("assigns null group_id to rows with no group marker", () => {
    const result = assignGroupIds([makeRow(), makeRow()]);
    expect(result[0].group_id).toBeNull();
    expect(result[1].group_id).toBeNull();
  });

  it("assigns the same UUID to rows sharing a group marker", () => {
    const result = assignGroupIds([
      makeRow({ group_marker: "1" }),
      makeRow({ group_marker: "2" }),
      makeRow({ group_marker: "1" }),
    ]);
    expect(result[0].group_id).not.toBeNull();
    expect(result[0].group_id).toBe(result[2].group_id);
    expect(result[1].group_id).not.toBe(result[0].group_id);
  });

  it("assigns different UUIDs to different group markers", () => {
    const result = assignGroupIds([
      makeRow({ group_marker: "A" }),
      makeRow({ group_marker: "B" }),
    ]);
    expect(result[0].group_id).not.toBe(result[1].group_id);
  });

  it("group UUIDs are valid UUID v4 format", () => {
    const result = assignGroupIds([makeRow({ group_marker: "1" })]);
    expect(result[0].group_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
```

- [ ] **Step 13: Run test to verify it fails**

```bash
pnpm --filter @dofus-tracker/sync test
```

Expected: FAIL — `Cannot find module '../parsers/group-detector.js'`

- [ ] **Step 14: Implement `group-detector.ts`**

Create `packages/sync/src/parsers/group-detector.ts`:

```typescript
import { randomUUID } from "crypto";
import type { ParsedQuestRow } from "./quest-row-parser.js";

export interface QuestRowWithGroupId extends ParsedQuestRow {
  group_id: string | null;
}

export function assignGroupIds(rows: ParsedQuestRow[]): QuestRowWithGroupId[] {
  const markerToUUID = new Map<string, string>();

  return rows.map((row) => {
    if (!row.group_marker) return { ...row, group_id: null };

    if (!markerToUUID.has(row.group_marker)) {
      markerToUUID.set(row.group_marker, randomUUID());
    }

    return { ...row, group_id: markerToUUID.get(row.group_marker)! };
  });
}
```

- [ ] **Step 15: Run all tests — expect all pass**

```bash
pnpm --filter @dofus-tracker/sync test
```

Expected:
```
✓ quest-row-parser.test.ts (6 tests)
✓ resource-parser.test.ts (4 tests)
✓ group-detector.test.ts (4 tests)
Test Files  3 passed (3)
Tests       14 passed (14)
```

- [ ] **Step 16: Commit**

```bash
git add packages/sync/
git commit -m "feat: add sync parsers with tests (quest, resource, group)"
```

---

### Task 6: `packages/sync` — Sheets Client, Upsert, CLI

**Files:**
- Create: `packages/sync/src/sheets-client.ts`
- Create: `packages/sync/src/upsert.ts`
- Create: `packages/sync/src/index.ts`

- [ ] **Step 1: Create `packages/sync/src/sheets-client.ts`**

```typescript
import { google } from "googleapis";
import { readFile } from "fs/promises";

export interface SheetTab {
  dofusName: string; // e.g. "Dofus Émeraude"
  dofusSlug: string; // e.g. "emeraude"
  rows: string[][];  // raw cell values, row-major
}

async function loadServiceAccount(keyPath: string): Promise<object> {
  const raw = await readFile(keyPath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Fetch all tabs from the Google Sheet.
 * Each tab = one Dofus. Tabs named "README", "Template", "Légende",
 * or starting with "_" are skipped.
 */
export async function fetchAllSheetTabs(
  sheetId: string,
  keyPath: string
): Promise<SheetTab[]> {
  const credentials = await loadServiceAccount(keyPath);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // Get all tab names
  const metaRes = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const sheetTabs = metaRes.data.sheets ?? [];

  const SKIP_TABS = new Set(["README", "Template", "Légende"]);
  const results: SheetTab[] = [];

  for (const tab of sheetTabs) {
    const tabName = tab.properties?.title ?? "";
    if (tabName.startsWith("_") || SKIP_TABS.has(tabName)) continue;

    const valuesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tabName}'`,
    });

    const rows = (valuesRes.data.values ?? []) as string[][];

    // Derive slug: normalize accents, lowercase, replace non-alphanumeric with hyphen
    const slug = tabName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    results.push({ dofusName: tabName, dofusSlug: slug, rows });
  }

  return results;
}
```

- [ ] **Step 2: Create `packages/sync/src/upsert.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";
import { parseQuestRow } from "./parsers/quest-row-parser.js";
import { parseResourceRows } from "./parsers/resource-parser.js";
import { assignGroupIds } from "./parsers/group-detector.js";
import type { SheetTab } from "./sheets-client.js";

export interface SyncReport {
  dofusName: string;
  questsUpserted: number;
  resourcesUpserted: number;
  errors: string[];
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function syncTabToSupabase(
  tab: SheetTab,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<SyncReport> {
  const client = createClient(supabaseUrl, serviceRoleKey);
  const report: SyncReport = {
    dofusName: tab.dofusName,
    questsUpserted: 0,
    resourcesUpserted: 0,
    errors: [],
  };

  try {
    // 1. Upsert the Dofus row (type/color/description must be set manually in Studio)
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

    // 2. Parse quest rows (skip row 0 = header)
    const dataRows = tab.rows.slice(1);
    let previousSection = "Prérequis";
    const parsedRows = [];

    for (const row of dataRows) {
      const sectionCell = row[0]?.trim();
      if (sectionCell) previousSection = sectionCell;
      const parsed = parseQuestRow(row, previousSection);
      if (parsed) parsedRows.push(parsed);
    }

    const rowsWithGroups = assignGroupIds(parsedRows);

    // 3. Upsert quests + chain entries in order
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

    // 4. Replace resources for this Dofus
    const parsedResources = parseResourceRows(dataRows);
    if (parsedResources.length > 0) {
      await client.from("resources").delete().eq("dofus_id", dofusId);

      const { error: resError } = await client
        .from("resources")
        .insert(parsedResources.map((r) => ({ ...r, dofus_id: dofusId })));

      if (resError) {
        report.errors.push(`Resources insert failed: ${resError.message}`);
      } else {
        report.resourcesUpserted = parsedResources.length;
      }
    }
  } catch (err) {
    report.errors.push(
      `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return report;
}
```

- [ ] **Step 3: Create `packages/sync/src/index.ts`**

```typescript
import { fetchAllSheetTabs } from "./sheets-client.js";
import { syncTabToSupabase } from "./upsert.js";

async function main() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ?? "./service-account.json";
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sheetId || !supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing required env vars: GOOGLE_SHEET_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  console.log("📋 Fetching Google Sheet tabs...");
  const tabs = await fetchAllSheetTabs(sheetId, keyPath);
  console.log(
    `Found ${tabs.length} Dofus tab(s): ${tabs.map((t) => t.dofusName).join(", ")}`
  );

  let totalQuests = 0;
  let totalResources = 0;
  const allErrors: string[] = [];

  for (const tab of tabs) {
    process.stdout.write(`⚙️  Syncing "${tab.dofusName}"... `);
    const report = await syncTabToSupabase(tab, supabaseUrl, serviceRoleKey);
    console.log(`✅ ${report.questsUpserted} quests, ${report.resourcesUpserted} resources`);

    if (report.errors.length > 0) {
      console.warn(`   ⚠️  ${report.errors.length} error(s):`, report.errors);
      allErrors.push(...report.errors);
    }

    totalQuests += report.questsUpserted;
    totalResources += report.resourcesUpserted;
  }

  console.log(`\n✅ Sync complete: ${totalQuests} quests, ${totalResources} resources`);

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

- [ ] **Step 4: Install dependencies**

```bash
pnpm install
```

Expected: `googleapis` installed in `packages/sync/node_modules`.

- [ ] **Step 5: Typecheck sync package**

```bash
pnpm --filter @dofus-tracker/sync typecheck
```

Expected: No TypeScript errors.

- [ ] **Step 6: Run all tests to confirm nothing broke**

```bash
pnpm test
```

Expected: 14 tests pass across 3 test files.

- [ ] **Step 7: Commit**

```bash
git add packages/sync/src/sheets-client.ts packages/sync/src/upsert.ts packages/sync/src/index.ts
git commit -m "feat: add Google Sheets client, upsert logic, and sync CLI"
```

---

### Task 7: First Real Sync

**Prerequisites:**
1. A Supabase project at [supabase.com](https://supabase.com) with migrations applied
2. A Google Cloud service account with Sheets API enabled, with the sheet shared with the service account email

- [ ] **Step 1: Create a Supabase project and push migrations**

Create a project at [supabase.com](https://supabase.com) → New Project. Then:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Expected: All 3 migrations applied with no errors.

- [ ] **Step 2: Create a Google Cloud service account**

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create or select a project
2. APIs & Services → Enable APIs → enable "Google Sheets API"
3. APIs & Services → Credentials → Create Credentials → Service Account
4. On the service account page → Keys tab → Add Key → JSON → download
5. Save the downloaded file as `service-account.json` at the project root (already in `.gitignore`)
6. Copy the service account email (e.g. `sync@my-project.iam.gserviceaccount.com`)
7. Open the Google Sheet → Share → paste the email → Viewer role → Send

- [ ] **Step 3: Set up `.env`**

```bash
cp .env.example .env
```

Edit `.env` with real values:
```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_SHEET_ID=1Abc...xyz
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account.json
```

Find your SUPABASE_URL and keys at: Supabase dashboard → Project Settings → API.
Find your GOOGLE_SHEET_ID in the sheet URL: `spreadsheets/d/<THIS_PART>/edit`.

- [ ] **Step 4: Run the sync**

```bash
source .env && pnpm sync
```

Expected output:
```
📋 Fetching Google Sheet tabs...
Found N Dofus tab(s): Dofus Émeraude, Dofus Ocre, ...
⚙️  Syncing "Dofus Émeraude"... ✅ 42 quests, 8 resources
⚙️  Syncing "Dofus Ocre"... ✅ 67 quests, 12 resources
...
✅ Sync complete: NNN quests, NN resources
```

- [ ] **Step 5: Verify data in Supabase Studio**

Open Supabase dashboard → Table Editor. Check:
- `dofus`: one row per Dofus tab
- `quests`: all unique quests (a quest shared by two Dofus appears only once)
- `dofus_quest_chains`: quest-to-dofus links with correct order_index and section

Run in the SQL editor:
```sql
SELECT d.name, COUNT(dqc.quest_id) AS quest_count
FROM dofus d
JOIN dofus_quest_chains dqc ON dqc.dofus_id = d.id
GROUP BY d.name
ORDER BY quest_count DESC;
```

Expected: each Dofus shows a plausible count (10–100+).

- [ ] **Step 6: If column indices mismatch, fix the parsers**

If the sheet format differs from the assumed layout (wrong columns), edit:
- `packages/sync/src/parsers/quest-row-parser.ts` — change which index maps to which field
- `packages/sync/src/parsers/resource-parser.ts` — change `COL_NAME`, `COL_EMOJI`, `COL_QTY`, `COL_KAMAS`

Re-run the sync until the data looks correct. Update tests if indices change.

- [ ] **Step 7: Commit any parser fixes**

```bash
git add packages/sync/src/parsers/
git commit -m "fix: adjust parser column mapping to match real sheet format"
```

---

### Task 8: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm build

      - name: Typecheck
        run: pnpm typecheck

      - name: Run tests
        run: pnpm test
```

- [ ] **Step 2: Commit and push**

```bash
git add .github/
git commit -m "ci: add GitHub Actions workflow (typecheck + test)"
git remote add origin https://github.com/your-username/dofus-tracker.git
git push -u origin main
```

- [ ] **Step 3: Verify CI passes**

Go to GitHub → your repo → Actions tab. Confirm the workflow runs green on the first push.
