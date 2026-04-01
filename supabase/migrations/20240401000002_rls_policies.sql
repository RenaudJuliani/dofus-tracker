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
