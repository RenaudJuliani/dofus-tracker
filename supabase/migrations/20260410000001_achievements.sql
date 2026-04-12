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

ALTER TABLE achievement_objectives ADD CONSTRAINT achievement_objectives_achievement_id_order_index_key UNIQUE (achievement_id, order_index);

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

-- achievements et achievement_objectives sont en lecture publique (comme quests)
-- Writes uniquement via service role key (sync script)

-- achievements and achievement_objectives have no RLS intentionally: public read, service role writes only
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
