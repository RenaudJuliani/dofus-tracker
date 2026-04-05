-- Add sub_section to dofus_quest_chains to capture zone-level groupings
-- (e.g. "Incarnam", "Astrub" within the "Les quêtes" section of Dofus Argenté)
ALTER TABLE dofus_quest_chains ADD COLUMN IF NOT EXISTS sub_section text;
