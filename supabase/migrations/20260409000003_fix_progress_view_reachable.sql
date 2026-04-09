-- Recalcule v_dofus_progress avec un total "atteignable" :
-- - quêtes génériques (pas de job_variant, pas d'alignement ou neutre)
-- - + 1 chemin métier (paysan = même nb que alchimiste)
-- - + min(chemin bonta complet, chemin brakmar complet)
--   où chemin = quêtes d'alignement (sans ordre) + UN ordre (supposés égaux entre eux)

CREATE OR REPLACE VIEW v_dofus_progress WITH (security_invoker = true) AS

WITH

-- 1. Quêtes génériques par dofus
generic_counts AS (
  SELECT dofus_id, COUNT(*) AS cnt
  FROM dofus_quest_chains
  WHERE job_variant IS NULL
    AND (alignment IS NULL OR alignment = 'neutre')
  GROUP BY dofus_id
),

-- 2. Quêtes d'un seul chemin métier (paysan)
job_counts AS (
  SELECT dofus_id, COUNT(*) AS cnt
  FROM dofus_quest_chains
  WHERE job_variant = 'paysan'
  GROUP BY dofus_id
),

-- 3. Quêtes d'alignement sans ordre (niveau faction)
alignment_base_counts AS (
  SELECT dofus_id, alignment, COUNT(*) AS cnt
  FROM dofus_quest_chains
  WHERE alignment IN ('bontarien', 'brakmarien')
    AND alignment_order IS NULL
  GROUP BY dofus_id, alignment
),

-- 4. Quêtes par ordre d'alignement (1 ordre par faction, supposés égaux)
alignment_order_counts AS (
  SELECT dofus_id, alignment, alignment_order, COUNT(*) AS cnt
  FROM dofus_quest_chains
  WHERE alignment IN ('bontarien', 'brakmarien')
    AND alignment_order IS NOT NULL
  GROUP BY dofus_id, alignment, alignment_order
),

-- 5. Pour chaque faction : base + max d'un ordre (si ordres égaux, MAX = n'importe lequel)
alignment_path_totals AS (
  SELECT
    ab.dofus_id,
    ab.alignment,
    ab.cnt + COALESCE(MAX(ao.cnt), 0) AS path_total
  FROM alignment_base_counts ab
  LEFT JOIN alignment_order_counts ao
    ON ao.dofus_id = ab.dofus_id AND ao.alignment = ab.alignment
  GROUP BY ab.dofus_id, ab.alignment, ab.cnt
),

-- 6. Minimum entre bonta et brakmar par dofus
min_alignment AS (
  SELECT dofus_id, MIN(path_total) AS cnt
  FROM alignment_path_totals
  GROUP BY dofus_id
),

-- 7. Total atteignable par dofus
dofus_reachable AS (
  SELECT
    d.id AS dofus_id,
    COALESCE(gc.cnt, 0) + COALESCE(jc.cnt, 0) + COALESCE(ma.cnt, 0) AS reachable_total
  FROM dofus d
  LEFT JOIN generic_counts  gc ON gc.dofus_id = d.id
  LEFT JOIN job_counts      jc ON jc.dofus_id = d.id
  LEFT JOIN min_alignment   ma ON ma.dofus_id = d.id
)

SELECT
  c.id               AS character_id,
  c.user_id,
  c.name             AS character_name,
  d.id               AS dofus_id,
  d.name             AS dofus_name,
  dr.reachable_total AS total_quests,
  COUNT(uqc.quest_id) AS completed_quests,
  LEAST(100, ROUND(
    COUNT(uqc.quest_id)::numeric / NULLIF(dr.reachable_total, 0) * 100
  )) AS progress_pct
FROM dofus d
JOIN dofus_reachable dr ON dr.dofus_id = d.id
JOIN dofus_quest_chains dqc ON dqc.dofus_id = d.id
CROSS JOIN characters c
LEFT JOIN user_quest_completions uqc
  ON uqc.quest_id = dqc.quest_id AND uqc.character_id = c.id
GROUP BY c.id, c.user_id, c.name, d.id, d.name, dr.reachable_total;
