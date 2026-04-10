import type { SupabaseClient } from "../client.js";
import type { QuestWithChain, QuestSection, QuestResource, AggregatedResource, Alignment, AlignmentOrder, JobVariant, QuestSearchResult } from "@dofus-tracker/types";

export async function getQuestsForDofus(
  client: SupabaseClient,
  dofusId: string,
  characterId: string
): Promise<QuestWithChain[]> {
  const { data: chains, error: chainsError } = await client
    .from("dofus_quest_chains")
    .select(`*, quest:quests(*)`)
    .eq("dofus_id", dofusId)
    .order("section", { ascending: true })
    .order("order_index", { ascending: true });
  if (chainsError) throw chainsError;
  if (!chains || chains.length === 0) return [];

  const questIds = chains.map((c) => c.quest_id);

  const [
    { data: completions, error: completionsError },
    { data: allChains, error: allChainsError },
    { data: questResources, error: resourcesError },
  ] = await Promise.all([
    client
      .from("user_quest_completions")
      .select("quest_id")
      .eq("character_id", characterId)
      .in("quest_id", questIds),
    client
      .from("dofus_quest_chains")
      .select("quest_id, dofus_id")
      .in("quest_id", questIds)
      .neq("dofus_id", dofusId),
    client
      .from("quest_resources")
      .select("*")
      .in("quest_id", questIds),
  ]);

  if (completionsError) throw completionsError;
  if (allChainsError) throw allChainsError;
  if (resourcesError) throw resourcesError;

  const completedSet = new Set((completions ?? []).map((c) => c.quest_id));

  const sharedMap = new Map<string, string[]>();
  for (const c of allChains ?? []) {
    const existing = sharedMap.get(c.quest_id) ?? [];
    sharedMap.set(c.quest_id, [...existing, c.dofus_id]);
  }

  const resourcesMap = new Map<string, QuestResource[]>();
  for (const r of questResources ?? []) {
    const existing = resourcesMap.get(r.quest_id) ?? [];
    resourcesMap.set(r.quest_id, [...existing, r as QuestResource]);
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
        sub_section: c.sub_section ?? null,
        order_index: c.order_index,
        group_id: c.group_id,
        quest_types: c.quest_types,
        combat_count: c.combat_count,
        is_avoidable: c.is_avoidable,
        alignment: (c.alignment ?? null) as Alignment | null,
        alignment_order: (c.alignment_order ?? null) as AlignmentOrder | null,
        job_variant: (c.job_variant ?? null) as JobVariant | null,
        note: c.note ?? null,
      },
      is_completed: completedSet.has(c.quest_id),
      shared_dofus_ids: sharedMap.get(c.quest_id) ?? [],
      resources: resourcesMap.get(c.quest_id) ?? [],
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
  questIds: string[]
): Promise<void> {
  if (questIds.length === 0) return;
  const rows = questIds.map((quest_id) => ({ character_id: characterId, quest_id }));
  const { error } = await client
    .from("user_quest_completions")
    .upsert(rows, { onConflict: "character_id,quest_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function bulkUncompleteSection(
  client: SupabaseClient,
  characterId: string,
  questIds: string[]
): Promise<void> {
  if (questIds.length === 0) return;
  const { error } = await client
    .from("user_quest_completions")
    .delete()
    .eq("character_id", characterId)
    .in("quest_id", questIds);
  if (error) throw error;
}

export async function getAggregatedResourcesForDofus(
  client: SupabaseClient,
  dofusId: string
): Promise<AggregatedResource[]> {
  const { data: chains, error: chainsError } = await client
    .from("dofus_quest_chains")
    .select("quest_id")
    .eq("dofus_id", dofusId);
  if (chainsError) throw chainsError;
  if (!chains || chains.length === 0) return [];

  const questIds = chains.map((c) => c.quest_id);

  const { data: rows, error: resourcesError } = await client
    .from("quest_resources")
    .select("name, quantity, is_kamas")
    .in("quest_id", questIds);
  if (resourcesError) throw resourcesError;

  const map = new Map<string, AggregatedResource>();
  for (const r of rows ?? []) {
    const existing = map.get(r.name);
    map.set(r.name, {
      name: r.name,
      quantity: (existing?.quantity ?? 0) + r.quantity,
      is_kamas: r.is_kamas,
    });
  }

  return Array.from(map.values());
}

export async function searchQuests(
  client: SupabaseClient,
  query: string
): Promise<QuestSearchResult[]> {
  const { data: quests, error: questError } = await client
    .from("quests")
    .select("id, name, slug")
    .ilike("name", `%${query}%`)
    .limit(40);

  if (questError) throw questError;
  if (!quests || quests.length === 0) return [];

  const questIds = quests.map((q: { id: string }) => q.id);

  const { data: chains, error: chainError } = await client
    .from("dofus_quest_chains")
    .select("quest_id, sub_section, dofus:dofus_id(id, name, slug, color, image_url)")
    .in("quest_id", questIds);

  if (chainError) throw chainError;

  const questMap = new Map(
    quests.map((q: { id: string; name: string; slug: string }) => [q.id, q])
  );

  const results: QuestSearchResult[] = [];
  for (const chain of chains ?? []) {
    const quest = questMap.get(chain.quest_id) as { id: string; name: string; slug: string } | undefined;
    if (!quest || !chain.dofus) continue;
    const d = (chain.dofus as unknown) as { id: string; name: string; slug: string; color: string; image_url: string | null };
    results.push({
      quest_id: quest.id,
      quest_name: quest.name,
      quest_slug: quest.slug,
      sub_section: chain.sub_section ?? null,
      dofus_id: d.id,
      dofus_name: d.name,
      dofus_slug: d.slug,
      dofus_color: d.color,
      dofus_image_url: d.image_url,
    });
  }

  return results;
}
