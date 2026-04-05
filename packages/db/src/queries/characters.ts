import type { SupabaseClient } from "../client.js";
import type { Character } from "@dofus-tracker/types";

export async function getCharacters(
  client: SupabaseClient,
  userId: string
): Promise<Character[]> {
  const { data, error } = await client
    .from("characters")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCharacter(
  client: SupabaseClient,
  userId: string,
  name: string,
  characterClass: string
): Promise<Character> {
  const { data, error } = await client
    .from("characters")
    .insert({ user_id: userId, name, character_class: characterClass })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCharacter(
  client: SupabaseClient,
  characterId: string,
  userId: string
): Promise<void> {
  const { error } = await client
    .from("characters")
    .delete()
    .eq("id", characterId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateCharacter(
  client: SupabaseClient,
  characterId: string,
  userId: string,
  name: string
): Promise<Character> {
  const { data, error } = await client
    .from("characters")
    .update({ name })
    .eq("id", characterId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
