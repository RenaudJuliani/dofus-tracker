-- Add job_variant column to dofus_quest_chains
ALTER TABLE dofus_quest_chains
  ADD COLUMN IF NOT EXISTS job_variant text CHECK (job_variant IN ('alchimiste', 'paysan'));
