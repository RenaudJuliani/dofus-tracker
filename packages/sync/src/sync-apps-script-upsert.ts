import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppsScriptData } from "./apps-script-client.js";
import { extractQuestsWithResources } from "./apps-script-client.js";

export interface AppsScriptSyncReport {
  resourcesUpserted: number;
  questsUnmatched: string[];
  errors: string[];
}

export async function syncQuestResources(
  data: AppsScriptData,
  client: SupabaseClient
): Promise<AppsScriptSyncReport> {
  const report: AppsScriptSyncReport = {
    resourcesUpserted: 0,
    questsUnmatched: [],
    errors: [],
  };

  const quests = extractQuestsWithResources(data);
  if (quests.length === 0) return report;

  // 1. Fetch all quest slugs → ids from DB in one query
  const slugs = quests.map((q) => q.slug);
  const { data: dbQuests, error: fetchError } = await client
    .from("quests")
    .select("id, slug")
    .in("slug", slugs);

  if (fetchError) {
    report.errors.push(`Failed to fetch quests: ${fetchError.message}`);
    return report;
  }

  const slugToId = new Map<string, string>(
    (dbQuests ?? []).map((q) => [q.slug, q.id])
  );

  // 2. Identify unmatched quests (in Apps Script but not in DB)
  for (const q of quests) {
    if (!slugToId.has(q.slug)) {
      report.questsUnmatched.push(q.slug);
    }
  }

  const matched = quests.filter((q) => slugToId.has(q.slug));
  if (matched.length === 0) return report;

  const matchedQuestIds = matched.map((q) => slugToId.get(q.slug)!);

  // 3. Delete existing quest_resources for all matched quests
  const { error: deleteError } = await client
    .from("quest_resources")
    .delete()
    .in("quest_id", matchedQuestIds);

  if (deleteError) {
    report.errors.push(`Delete failed: ${deleteError.message}`);
    return report;
  }

  // 4. Insert all new quest_resources
  const rows = matched.flatMap((q) =>
    q.resources.map((r) => ({
      quest_id: slugToId.get(q.slug)!,
      name: r.name,
      quantity: r.quantity,
      is_kamas: r.is_kamas,
    }))
  );

  const { error: insertError } = await client
    .from("quest_resources")
    .insert(rows);

  if (insertError) {
    report.errors.push(`Insert failed: ${insertError.message}`);
    return report;
  }

  report.resourcesUpserted = rows.length;
  return report;
}
