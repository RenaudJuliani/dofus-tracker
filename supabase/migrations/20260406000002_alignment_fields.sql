-- Add alignment columns to dofus_quest_chains
ALTER TABLE dofus_quest_chains
  ADD COLUMN IF NOT EXISTS alignment text CHECK (alignment IN ('neutre', 'bontarien', 'brakmarien')),
  ADD COLUMN IF NOT EXISTS alignment_order text CHECK (alignment_order IN (
    'coeur-vaillant', 'oeil-attentif', 'esprit-salvateur',
    'coeur-saignant', 'oeil-putride', 'esprit-malsain'
  ));
