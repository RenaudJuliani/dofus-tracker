-- Add positive quantity constraint to quest_resources
ALTER TABLE quest_resources ADD CONSTRAINT quest_resources_quantity_positive CHECK (quantity > 0);
