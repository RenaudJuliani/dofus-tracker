import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient(url: string, key: string) {
  return createClient(url, key);
}

export type SupabaseClient = ReturnType<typeof createSupabaseClient>;
