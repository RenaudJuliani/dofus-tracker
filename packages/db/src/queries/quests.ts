import type { SupabaseClient } from "../client.js";
import type { QuestWithChain, QuestSection } from "@dofus-tracker/types";

export async function getQuestsForDofus(
  client: SupabaseClient,
  dofusId: string,
  characterId: string
): Promise<QuestWithChain[]> {
  // Fetch chains joined with quest data
  const { data: chains, error: chainsError } = await client
    .from("dofus_quest_chains")
    .select(`*, quest:quests(*)`)
    .eq("dofus_id", dofusId)
    .order("section", { ascending: true })
    .order("order_index", { ascending: true });
  if (chainsError) throw chainsError;
  if (!chains || chains.length === 0) return [];

  const questIds = chains.map((c) => c.quest_id);

  // Fetch completions and shared chains in parallel (both are independent of each other)
  const [{ data: completions, error: completionsError }, { data: allChains, error: allChainsError }] = await Promise.all([
    // Fetch which quests this character has completed
    client
      .from("user_quest_completions")
      .select("quest_id")
      .eq("character_id", characterId)
      .in("quest_id", questIds),
    // Fetch other Dofus that share these quests (for the cross-dofus badge)
    client
      .from("dofus_quest_chains")
      .select("quest_id, dofus_id")
      .in("quest_id", questIds)
      .neq("dofus_id", dofusId),
  ]);
  if (completionsError) throw completionsError;
  if (allChainsError) throw allChainsError;
  const completedSet = new Set((completions ?? []).map((c) => c.quest_id));

  const sharedMap = new Map<string, string[]>();
  for (const c of allChains ?? []) {
    const existing = sharedMap.get(c.quest_id) ?? [];
    sharedMap.set(c.quest_id, [...existing, c.dofus_id]);
  }

  return chains
    .filter((c) => c.quest != null)
    .map((c) => ({
    ...c.quest,
    chain: {
      id: c.id,
      dofus_id: c.dofus_id,
      quest_id: c.quest_id,
      section: c.section as QuestSection,
      order_index: c.order_index,
      group_id: c.group_id,
      quest_types: c.quest_types,
      combat_count: c.combat_count,
      is_avoidable: c.is_avoidable,
    },
    is_completed: completedSet.has(c.quest_id),
    shared_dofus_ids: sharedMap.get(c.quest_id) ?? [],
  }));
}

export async function toggleQuestCompletion(
  client: SupabaseClient,
  characterId: string,
  questId: string,
  completed: boolean
): Promise<void> {
  if (completed) {
    const { error } = await client
      .from("user_quest_completions")
      .insert({ character_id: characterId, quest_id: questId });
    // Ignore "already exists" (duplicate key = already completed)
    if (error && error.code !== "23505") throw error;
  } else {
    const { error } = await client
      .from("user_quest_completions")
      .delete()
      .eq("character_id", characterId)
      .eq("quest_id", questId);
    if (error) throw error;
  }
}

export async function bulkCompleteSection(
  client: SupabaseClient,
  characterId: string,
  dofusId: string,
  section: QuestSection
): Promise<void> {
  const { data: chains, error: chainsError } = await client
    .from("dofus_quest_chains")
    .select("quest_id")
    .eq("dofus_id", dofusId)
    .eq("section", section);
  if (chainsError) throw chainsError;

  const rows = (chains ?? []).map((c) => ({
    character_id: characterId,
    quest_id: c.quest_id,
  }));
  if (rows.length === 0) return;

  const { error } = await client
    .from("user_quest_completions")
    .upsert(rows, { onConflict: "character_id,quest_id", ignoreDuplicates: true });
  if (error) throw error;
}
