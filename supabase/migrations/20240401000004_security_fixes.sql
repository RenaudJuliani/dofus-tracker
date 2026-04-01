-- Fix 1: Add WITH CHECK to characters UPDATE policy to prevent user_id reassignment
DROP POLICY "Users can update own characters" ON characters;
CREATE POLICY "Users can update own characters" ON characters
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fix 2: Enable RLS on public reference tables (read-only via anon key)
-- Writes are only possible via the service-role key which bypasses RLS
ALTER TABLE dofus ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE dofus_quest_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON dofus FOR SELECT USING (true);
CREATE POLICY "Public read" ON quests FOR SELECT USING (true);
CREATE POLICY "Public read" ON dofus_quest_chains FOR SELECT USING (true);
CREATE POLICY "Public read" ON resources FOR SELECT USING (true);
