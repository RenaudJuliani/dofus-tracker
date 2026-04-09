-- Change group_id from uuid to text for human-readable group identifiers
ALTER TABLE dofus_quest_chains ALTER COLUMN group_id TYPE text USING group_id::text;
