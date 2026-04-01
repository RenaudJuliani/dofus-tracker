import type { SupabaseClient } from "../client.js";
import type { Resource } from "@dofus-tracker/types";

export async function getResourcesForDofus(
  client: SupabaseClient,
  dofusId: string
): Promise<Resource[]> {
  const { data, error } = await client
    .from("resources")
    .select("*")
    .eq("dofus_id", dofusId)
    .order("is_kamas", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
