import type { SupabaseClient } from "@supabase/supabase-js";
import { extractAllQuests, type AppsScriptData } from "./apps-script-client.js";
import { getSubSection } from "./sub-section-overrides.js";

export interface FullSyncReport {
  questsUpserted: number;
  resourcesUpserted: number;
  errors: string[];
}

export async function syncAllFromAppsScript(
  data: AppsScriptData,
  client: SupabaseClient
): Promise<FullSyncReport> {
  const report: FullSyncReport = { questsUpserted: 0, resourcesUpserted: 0, errors: [] };

  const entries = extractAllQuests(data);

  // Group by dofus slug for efficient processing
  const byDofus = new Map<string, typeof entries>();
  for (const entry of entries) {
    if (!byDofus.has(entry.dofusSlug)) byDofus.set(entry.dofusSlug, []);
    byDofus.get(entry.dofusSlug)!.push(entry);
  }

  for (const [dofusSlug, dofusEntries] of byDofus) {
    const { dofusName } = dofusEntries[0];

    // 1. Upsert dofus
    const { data: dofusRow, error: dofusError } = await client
      .from("dofus")
      .upsert(
        { name: dofusName, slug: dofusSlug, type: "primordial", color: "#4ade80", description: "", recommended_level: 0 },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (dofusError || !dofusRow) {
      report.errors.push(`Dofus upsert failed for "${dofusName}": ${dofusError?.message}`);
      continue;
    }

    const dofusId = dofusRow.id as string;
    const questIdsWithResources: string[] = [];
    const resourceRows: Array<{ quest_id: string; name: string; quantity: number; is_kamas: boolean }> = [];

    // 2. Upsert each quest + chain
    for (const entry of dofusEntries) {
      const { data: questRow, error: questError } = await client
        .from("quests")
        .upsert(
          {
            name: entry.questName,
            slug: entry.questSlug,
            dofuspourlesnoobs_url: `https://www.dofuspourlesnoobs.com/${entry.questSlug}.html`,
          },
          { onConflict: "slug" }
        )
        .select("id")
        .single();

      if (questError || !questRow) {
        report.errors.push(`Quest upsert failed for "${entry.questName}": ${questError?.message}`);
        continue;
      }

      const questId = questRow.id as string;

      const subSection = getSubSection(entry.dofusSlug, entry.questSlug);

      const { error: chainError } = await client
        .from("dofus_quest_chains")
        .upsert(
          {
            dofus_id: dofusId,
            quest_id: questId,
            section: entry.section,
            sub_section: subSection,
            order_index: entry.orderIndex,
            group_id: null,
            quest_types: [],
            combat_count: null,
            is_avoidable: false,
          },
          { onConflict: "dofus_id,quest_id" }
        );

      if (chainError) {
        report.errors.push(`Chain upsert failed for "${entry.questName}": ${chainError.message}`);
        continue;
      }

      report.questsUpserted++;

      // Collect resources for bulk insert
      if (entry.resources.length > 0) {
        questIdsWithResources.push(questId);
        for (const r of entry.resources) {
          resourceRows.push({ quest_id: questId, name: r.name, quantity: r.quantity, is_kamas: r.is_kamas });
        }
      }
    }

    // 3. Replace resources for this dofus in bulk
    if (questIdsWithResources.length > 0) {
      const { error: deleteError } = await client
        .from("quest_resources")
        .delete()
        .in("quest_id", questIdsWithResources);

      if (deleteError) {
        report.errors.push(`Resource delete failed for "${dofusName}": ${deleteError.message}`);
        continue;
      }

      const { error: insertError } = await client.from("quest_resources").insert(resourceRows);
      if (insertError) {
        report.errors.push(`Resource insert failed for "${dofusName}": ${insertError.message}`);
      } else {
        report.resourcesUpserted += resourceRows.length;
      }
    }
  }

  return report;
}
