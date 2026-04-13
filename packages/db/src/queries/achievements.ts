import type { SupabaseClient } from "../client.js";
import type {
  AchievementObjective,
  AchievementObjectiveWithStatus,
  AchievementSubcategory,
  AchievementWithProgress,
} from "@dofus-tracker/types";

export async function getAchievementSubcategories(
  client: SupabaseClient,
  characterId: string
): Promise<AchievementSubcategory[]> {
  const { data: achievements, error } = await client
    .from("achievements")
    .select("id, subcategory_id, subcategory_name, points");
  if (error) throw error;
  if (!achievements || achievements.length === 0) return [];

  const achievementIds = achievements.map((a: { id: number }) => a.id);
  const { data: objectiveRows, error: objError } = await client
    .from("achievement_objectives")
    .select("id, achievement_id, quest_id")
    .in("achievement_id", achievementIds);
  if (objError) throw objError;

  const objectivesByAchievement = new Map<number, { id: string; quest_id: string | null }[]>();
  for (const o of objectiveRows ?? []) {
    const list = objectivesByAchievement.get(o.achievement_id) ?? [];
    list.push({ id: o.id, quest_id: o.quest_id });
    objectivesByAchievement.set(o.achievement_id, list);
  }

  // Fetch all completions for the character — avoids .in() with 1000+ items (URL too long)
  const [
    { data: manualCompletions, error: manualError },
    { data: questCompletions, error: questError },
  ] = await Promise.all([
    client
      .from("achievement_objective_completions")
      .select("objective_id")
      .eq("character_id", characterId),
    client
      .from("user_quest_completions")
      .select("quest_id")
      .eq("character_id", characterId),
  ]);
  if (manualError) throw manualError;
  if (questError) throw questError;

  const manualSet = new Set((manualCompletions ?? []).map((c: { objective_id: string }) => c.objective_id));
  const questSet = new Set((questCompletions ?? []).map((c: { quest_id: string }) => c.quest_id));

  const subcatMap = new Map<number, { name: string; completed: number; total: number; earned_points: number }>();
  for (const a of achievements) {
    const entry = subcatMap.get(a.subcategory_id) ?? {
      name: a.subcategory_name,
      completed: 0,
      total: 0,
      earned_points: 0,
    };
    entry.total++;
    const objectives = objectivesByAchievement.get(a.id) ?? [];
    const allDone =
      objectives.length > 0 &&
      objectives.every((o) => (o.quest_id && questSet.has(o.quest_id)) || manualSet.has(o.id));
    if (allDone) {
      entry.completed++;
      entry.earned_points += a.points;
    }
    subcatMap.set(a.subcategory_id, entry);
  }

  return Array.from(subcatMap.entries())
    .map(([subcategory_id, { name, completed, total, earned_points }]) => ({
      subcategory_id,
      subcategory_name: name,
      completed_achievements: completed,
      total_achievements: total,
      earned_points,
    }))
    .sort((a, b) => b.total_achievements - a.total_achievements);
}

export async function getAchievementsForCharacter(
  client: SupabaseClient,
  subcategoryId: number,
  characterId: string
): Promise<AchievementWithProgress[]> {
  const { data: achievements, error: achError } = await client
    .from("achievements")
    .select("*")
    .eq("subcategory_id", subcategoryId)
    .order("order_index");
  if (achError) throw achError;
  if (!achievements || achievements.length === 0) return [];

  const achievementIds = achievements.map((a: { id: number }) => a.id);
  const { data: objectiveRows, error: objError } = await client
    .from("achievement_objectives")
    .select("*")
    .in("achievement_id", achievementIds)
    .order("order_index");
  if (objError) throw objError;

  const objectivesByAchievement = new Map<number, AchievementObjective[]>();
  for (const o of objectiveRows ?? []) {
    const list = objectivesByAchievement.get(o.achievement_id) ?? [];
    list.push(o as AchievementObjective);
    objectivesByAchievement.set(o.achievement_id, list);
  }

  // Fetch all completions for the character — avoids .in() with large arrays (URL too long)
  const [
    { data: manualCompletions, error: manualError },
    { data: questCompletions, error: questError },
  ] = await Promise.all([
    client
      .from("achievement_objective_completions")
      .select("objective_id")
      .eq("character_id", characterId),
    client
      .from("user_quest_completions")
      .select("quest_id")
      .eq("character_id", characterId),
  ]);
  if (manualError) throw manualError;
  if (questError) throw questError;

  const manualSet = new Set((manualCompletions ?? []).map((c: { objective_id: string }) => c.objective_id));
  const questSet = new Set((questCompletions ?? []).map((c: { quest_id: string }) => c.quest_id));

  return achievements.map((a) => {
    const objectives = (objectivesByAchievement.get(a.id) ?? [])
      .map((o): AchievementObjectiveWithStatus => {
        const isAuto = o.quest_id != null && questSet.has(o.quest_id);
        const isManual = manualSet.has(o.id);
        return {
          ...o,
          is_completed: isAuto || isManual,
          completion_source: isAuto ? "auto" : isManual ? "manual" : null,
        };
      });
    return {
      id: a.id,
      name: a.name,
      description: a.description,
      points: a.points,
      level_required: a.level_required,
      subcategory_id: a.subcategory_id,
      subcategory_name: a.subcategory_name,
      order_index: a.order_index,
      objectives,
      completed_count: objectives.filter((o) => o.is_completed).length,
      total_count: objectives.length,
    };
  });
}

export async function toggleObjectiveCompletion(
  client: SupabaseClient,
  characterId: string,
  objectiveId: string,
  questId: string | null,
  completed: boolean
): Promise<void> {
  if (questId) {
    if (completed) {
      const { error } = await client
        .from("user_quest_completions")
        .insert({ character_id: characterId, quest_id: questId });
      if (error && error.code !== "23505") throw error;
    } else {
      const { error } = await client
        .from("user_quest_completions")
        .delete()
        .eq("character_id", characterId)
        .eq("quest_id", questId);
      if (error) throw error;
    }
  } else {
    if (completed) {
      const { error } = await client
        .from("achievement_objective_completions")
        .insert({ character_id: characterId, objective_id: objectiveId });
      if (error && error.code !== "23505") throw error;
    } else {
      const { error } = await client
        .from("achievement_objective_completions")
        .delete()
        .eq("character_id", characterId)
        .eq("objective_id", objectiveId);
      if (error) throw error;
    }
  }
}
