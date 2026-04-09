-- Add optional note field to dofus_quest_chains for quest-level and group-level instructional text
ALTER TABLE dofus_quest_chains ADD COLUMN note text;
