-- ============================================================
-- Fix quest section assignments
-- À exécuter dans l'éditeur SQL Supabase (Dashboard → SQL Editor)
-- Idempotent : peut être relancé sans risque
-- ============================================================

-- ============================================================
-- 1. Supprimer la quête parasite "toIgnore"
-- ============================================================

DELETE FROM dofus_quest_chains
WHERE quest_id IN (SELECT id FROM quests WHERE slug = 'toignore');

DELETE FROM quests WHERE slug = 'toignore';


-- ============================================================
-- 2. Corriger les sections mal classées (main → prerequisite)
--
-- Cause : dans le JSON apps-script, "Prérequis" est un titre
-- de sous-section (pas de section parente), donc le sync
-- ignorait ce titre et mettait tout en section = 'main'.
-- ============================================================

-- Helper macro utilisé dans chaque bloc :
--   dofus_id  = sous-requête sur le slug/nom du Dofus
--   quest_id  = sous-requête sur les slugs des quêtes prérequis

-- ----------------------------------------------------------------
-- Dofus Cawotte
-- ----------------------------------------------------------------
UPDATE dofus_quest_chains SET section = 'prerequisite'
WHERE dofus_id IN (SELECT id FROM dofus WHERE name ILIKE '%Cawotte%')
  AND quest_id IN (
    SELECT id FROM quests WHERE slug IN (
      'l-anneau-de-tous-les-dangers',
      'sous-le-regard-des-dieux',
      'reponse-a-tout',
      'le-village-dans-les-nuages',
      'espoirs-et-tragedies',
      'dans-la-gueule-du-milimulou',
      'destination-astrub',
      'les-principes-d-archie-m-aident',
      'on-marche-sur-des-oeufs',
      'conseil-de-classe',
      'quete-de-classe',
      'ca-sent-le-gaz',
      'balade-en-foret',
      'le-reveil-de-pandala',
      'le-receptacle-des-dofus',
      'intrusion-chez-les-wabbits',
      'un-sage-parmi-les-sages',
      'protection-divine',
      'un-pendule-pour-guider-ses-pas',
      'voir-le-dark-vlad-et-mourir-ou-pas',
      'la-magicienne-des-marecages'
    )
  );

-- ----------------------------------------------------------------
-- Dofus Domakuro
-- ----------------------------------------------------------------
UPDATE dofus_quest_chains SET section = 'prerequisite'
WHERE dofus_id IN (SELECT id FROM dofus WHERE name ILIKE '%Domakuro%')
  AND quest_id IN (
    SELECT id FROM quests WHERE slug IN (
      'ca-est-frugal-une-fois'
    )
  );

-- ----------------------------------------------------------------
-- Dotruche
-- ----------------------------------------------------------------
UPDATE dofus_quest_chains SET section = 'prerequisite'
WHERE dofus_id IN (SELECT id FROM dofus WHERE name ILIKE '%Dotruche%' OR name ILIKE '%Truche%')
  AND quest_id IN (
    SELECT id FROM quests WHERE slug IN (
      'scene-de-menage',
      'shushu-et-lulu',
      'bien-velu-c-est-kerubim'
    )
  );

-- ----------------------------------------------------------------
-- Dofus Forgelave
-- ----------------------------------------------------------------
UPDATE dofus_quest_chains SET section = 'prerequisite'
WHERE dofus_id IN (SELECT id FROM dofus WHERE name ILIKE '%Forgelave%')
  AND quest_id IN (
    SELECT id FROM quests WHERE slug IN (
      'mieux-vaut-ne-pas-se-fier-a-la-premiere-impression'
    )
  );

-- ----------------------------------------------------------------
-- Dofus Pourpre
-- ----------------------------------------------------------------
UPDATE dofus_quest_chains SET section = 'prerequisite'
WHERE dofus_id IN (SELECT id FROM dofus WHERE name ILIKE '%Pourpre%')
  AND quest_id IN (
    SELECT id FROM quests WHERE slug IN (
      'l-anneau-de-tous-les-dangers',
      'sous-le-regard-des-dieux',
      'reponse-a-tout',
      'le-village-dans-les-nuages',
      'espoirs-et-tragedies',
      'dans-la-gueule-du-milimulou',
      'destination-astrub',
      'les-principes-d-archie-m-aident',
      'on-marche-sur-des-oeufs',
      'conseil-de-classe',
      'quete-de-classe',
      'ca-sent-le-gaz',
      'balade-en-foret',
      'le-reveil-de-pandala',
      'le-receptacle-des-dofus',
      'intrusion-chez-les-wabbits',
      'un-sage-parmi-les-sages',
      'protection-divine',
      'un-pendule-pour-guider-ses-pas',
      'voir-le-dark-vlad-et-mourir-ou-pas',
      'la-magicienne-des-marecages'
    )
  );

-- ----------------------------------------------------------------
-- Dofus Tacheté
-- ----------------------------------------------------------------
UPDATE dofus_quest_chains SET section = 'prerequisite'
WHERE dofus_id IN (SELECT id FROM dofus WHERE name ILIKE '%Tach%')
  AND quest_id IN (
    SELECT id FROM quests WHERE slug IN (
      'l-anneau-de-tous-les-dangers',
      'sous-le-regard-des-dieux',
      'reponse-a-tout',
      'le-village-dans-les-nuages',
      'espoirs-et-tragedies',
      'dans-la-gueule-du-milimulou',
      'destination-astrub',
      'les-principes-d-archie-m-aident',
      'on-marche-sur-des-oeufs',
      'conseil-de-classe',
      'quete-de-classe',
      'ca-sent-le-gaz',
      'balade-en-foret',
      'le-reveil-de-pandala',
      'dites-le-avec-des-fleurs',
      'un-pendule-pour-guider-ses-pas',
      'le-receptacle-des-dofus',
      'intrusion-chez-les-wabbits',
      'un-sage-parmi-les-sages',
      'protection-divine',
      'voir-le-dark-vlad-et-mourir-ou-pas',
      'la-magicienne-des-marecages',
      'retourner-voir-le-dark-vlad-toujours-sans-mourir',
      'qui-botte-le-cul-des-culs-bottes',
      'le-voleur-d-ames',
      'ca-est-frugal-une-fois',
      'a-la-croisee-des-mondes',
      'sous-le-bois-de-sa-colere',
      'au-nom-de-l-art',
      'la-jetee-des-enfants-perdus',
      'le-festival-de-la-lanterne',
      'l-equilibre-des-forces',
      'sang-d-encre',
      'maudite-disparition',
      'requiem-pour-un-yokai',
      'jusqu-a-leur-dernier-soupir'
    )
  );

-- ----------------------------------------------------------------
-- Dofus Turquoise
-- ----------------------------------------------------------------
UPDATE dofus_quest_chains SET section = 'prerequisite'
WHERE dofus_id IN (SELECT id FROM dofus WHERE name ILIKE '%Turquoise%')
  AND quest_id IN (
    SELECT id FROM quests WHERE slug IN (
      'l-anneau-de-tous-les-dangers',
      'sous-le-regard-des-dieux',
      'reponse-a-tout',
      'le-village-dans-les-nuages',
      'espoirs-et-tragedies',
      'dans-la-gueule-du-milimulou',
      'destination-astrub',
      'les-principes-d-archie-m-aident',
      'on-marche-sur-des-oeufs',
      'conseil-de-classe',
      'quete-de-classe',
      'ca-sent-le-gaz',
      'balade-en-foret',
      'le-reveil-de-pandala',
      'le-receptacle-des-dofus',
      'intrusion-chez-les-wabbits',
      'un-sage-parmi-les-sages',
      'protection-divine',
      'un-pendule-pour-guider-ses-pas',
      'voir-le-dark-vlad-et-mourir-ou-pas',
      'la-magicienne-des-marecages'
    )
  );

-- ----------------------------------------------------------------
-- Dofus Dorigami
-- ----------------------------------------------------------------
UPDATE dofus_quest_chains SET section = 'prerequisite'
WHERE dofus_id IN (SELECT id FROM dofus WHERE name ILIKE '%Dorigami%' OR name ILIKE '%Origami%')
  AND quest_id IN (
    SELECT id FROM quests WHERE slug IN (
      'l-anneau-de-tous-les-dangers',
      'sous-le-regard-des-dieux',
      'reponse-a-tout',
      'le-village-dans-les-nuages',
      'espoirs-et-tragedies',
      'dans-la-gueule-du-milimulou',
      'destination-astrub',
      'les-principes-d-archie-m-aident',
      'on-marche-sur-des-oeufs',
      'conseil-de-classe',
      'quete-de-classe',
      'ca-sent-le-gaz',
      'balade-en-foret',
      'le-reveil-de-pandala',
      'le-receptacle-des-dofus',
      'intrusion-chez-les-wabbits',
      'un-sage-parmi-les-sages',
      'protection-divine',
      'un-pendule-pour-guider-ses-pas',
      'voir-le-dark-vlad-et-mourir-ou-pas',
      'a-la-croisee-des-mondes',
      'sous-le-bois-de-sa-colere',
      'au-nom-de-l-art',
      'la-jetee-des-enfants-perdus',
      'le-festival-de-la-lanterne',
      'l-equilibre-des-forces',
      'sang-d-encre',
      'le-voleur-d-ames'
    )
  );


-- ============================================================
-- 3. Vérification (optionnel - à lancer après les UPDATE)
-- Compte les quêtes par section pour chaque Dofus concerné
-- ============================================================

SELECT
  d.name AS dofus,
  c.section,
  COUNT(*) AS nb_quetes
FROM dofus_quest_chains c
JOIN dofus d ON d.id = c.dofus_id
WHERE d.name ILIKE ANY(ARRAY['%Cawotte%', '%Domakuro%', '%Dotruche%', '%Truche%',
                              '%Forgelave%', '%Pourpre%', '%Tach%',
                              '%Turquoise%', '%Dorigami%', '%Origami%'])
GROUP BY d.name, c.section
ORDER BY d.name, c.section;
