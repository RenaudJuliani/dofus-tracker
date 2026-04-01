-- Seed two Dofus for local testing
INSERT INTO dofus (id, name, slug, type, color, description, recommended_level)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dofus Émeraude', 'emeraude', 'primordial', '#22c55e', 'L''œuf légendaire des dragons émeraude.', 80),
  ('00000000-0000-0000-0000-000000000002', 'Dofus Ocre', 'ocre', 'primordial', '#f59e0b', 'L''œuf mythique convoité par tous.', 150)
ON CONFLICT (slug) DO NOTHING;

-- Seed quests (shared across Dofus)
INSERT INTO quests (id, name, slug, dofuspourlesnoobs_url)
VALUES
  ('00000000-0000-0000-0001-000000000001', 'La Quête de Kwisatz', 'la-quete-de-kwisatz', 'https://dofuspourlesnoobs.com/quete-de-kwisatz.html'),
  ('00000000-0000-0000-0001-000000000002', 'L''Héritage des Dragons', 'heritage-des-dragons', 'https://dofuspourlesnoobs.com/heritage-des-dragons.html')
ON CONFLICT (slug) DO NOTHING;

-- Seed quest chains for Dofus Émeraude
INSERT INTO dofus_quest_chains (dofus_id, quest_id, section, order_index, quest_types)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 'prerequisite', 1, ARRAY['combat_solo']),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 'main', 1, ARRAY['donjon'])
ON CONFLICT (dofus_id, quest_id) DO NOTHING;

-- Seed resources (plain INSERT — seed only runs on fresh DB via supabase db reset)
INSERT INTO resources (name, icon_emoji, dofus_id, quantity_per_character, is_kamas)
VALUES
  ('Écaille de Dragon Émeraude', '🐉', '00000000-0000-0000-0000-000000000001', 100, false),
  ('Kamas', '💰', '00000000-0000-0000-0000-000000000001', 1000000, true);
