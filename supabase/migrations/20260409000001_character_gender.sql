ALTER TABLE characters
  ADD COLUMN gender TEXT NOT NULL DEFAULT 'm' CHECK (gender IN ('m', 'f'));
