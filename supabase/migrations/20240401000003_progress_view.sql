-- security_invoker = true means the view respects the caller's RLS policies
-- (characters visible only to their owner, completions scoped accordingly)
CREATE OR REPLACE VIEW v_dofus_progress WITH (security_invoker = true) AS
SELECT
  c.id AS character_id,
  c.user_id,
  c.name AS character_name,
  d.id AS dofus_id,
  d.name AS dofus_name,
  COUNT(dqc.quest_id) AS total_quests,
  COUNT(uqc.quest_id) AS completed_quests,
  ROUND(
    COUNT(uqc.quest_id)::numeric / NULLIF(COUNT(dqc.quest_id), 0) * 100
  ) AS progress_pct
FROM dofus d
JOIN dofus_quest_chains dqc ON dqc.dofus_id = d.id
CROSS JOIN characters c
LEFT JOIN user_quest_completions uqc
  ON uqc.quest_id = dqc.quest_id AND uqc.character_id = c.id
GROUP BY c.id, c.user_id, c.name, d.id, d.name;
