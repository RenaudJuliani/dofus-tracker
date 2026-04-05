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
