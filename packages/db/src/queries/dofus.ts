import type { SupabaseClient } from "../client.js";
import type { Dofus, DofusProgress } from "@dofus-tracker/types";

export async function getDofusList(client: SupabaseClient): Promise<Dofus[]> {
  const { data, error } = await client
    .from("dofus")
    .select("id, name, slug, type, color, description, image_url, quest_chains(count)")
    .in("type", ["primordial", "secondaire"])
    .order("type", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((d) => (d.quest_chains as unknown as { count: number }[])[0]?.count > 0)
    .map(({ quest_chains: _, ...rest }) => rest as Dofus);
}

export async function getDofusById(
  client: SupabaseClient,
  id: string
): Promise<Dofus | null> {
  const { data, error } = await client
    .from("dofus")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

export async function getDofusBySlug(
  client: SupabaseClient,
  slug: string
): Promise<Dofus | null> {
  const { data, error } = await client
    .from("dofus")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

/**
 * Returns progress rows for a specific character across all Dofus.
 * Always provide characterId — the underlying v_dofus_progress view uses a
 * CROSS JOIN (characters × dofus) and is expensive without this filter.
 */
export async function getDofusProgressForCharacter(
  client: SupabaseClient,
  characterId: string
): Promise<DofusProgress[]> {
  const { data, error } = await client
    .from("v_dofus_progress")
    .select("*")
    .eq("character_id", characterId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    // Cast progress_pct: PostgreSQL NUMERIC comes back as string over REST wire.
    // null happens when a Dofus has no quest chain rows (NULLIF guard in the view).
    progress_pct: row.progress_pct != null ? Number(row.progress_pct) : 0,
  })) as DofusProgress[];
}

export async function getAllProgressForUser(
  client: SupabaseClient,
  userId: string
): Promise<DofusProgress[]> {
  const { data, error } = await client
    .from("v_dofus_progress")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    progress_pct: row.progress_pct != null ? Number(row.progress_pct) : 0,
  })) as DofusProgress[];
}
