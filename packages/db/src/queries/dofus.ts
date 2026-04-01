import type { SupabaseClient } from "../client.js";
import type { Dofus, DofusProgress } from "@dofus-tracker/types";

export async function getDofusList(client: SupabaseClient): Promise<Dofus[]> {
  const { data, error } = await client
    .from("dofus")
    .select("*")
    .order("type", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
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
    // Cast progress_pct: Supabase may return PostgreSQL NUMERIC as string
    progress_pct: Number(row.progress_pct),
  })) as DofusProgress[];
}
