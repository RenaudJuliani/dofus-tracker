-- Dofus items (one row per Dofus in the game)
CREATE TABLE dofus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  dofuspourlesnoobs_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Dofus ↔ Quest relation with ordering and quest metadata
CREATE TABLE dofus_quest_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- Note: column is 'character_class' (not 'class') to match the TypeScript interface
CREATE TABLE characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  character_class text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Quest completions — per character, per quest (NOT per dofus)
-- Checking a quest here marks it complete for ALL dofus that require it
CREATE TABLE user_quest_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
