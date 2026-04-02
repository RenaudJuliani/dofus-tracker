import type { SupabaseClient } from "@supabase/supabase-js";
import { parseQuestRow } from "./parsers/quest-row-parser.js";
import { parseResourceRows } from "./parsers/resource-parser.js";
import { assignGroupIds } from "./parsers/group-detector.js";
import type { SheetTab } from "./sheets-client.js";
import { nameToSlug } from "./utils.js";

export interface SyncReport {
  dofusName: string;
  questsUpserted: number;
  resourcesUpserted: number;
  errors: string[];
}

export async function syncTabToSupabase(
  tab: SheetTab,
  client: SupabaseClient
): Promise<SyncReport> {
  const report: SyncReport = {
    dofusName: tab.dofusName,
    questsUpserted: 0,
    resourcesUpserted: 0,
    errors: [],
  };

  try {
    // 1. Upsert the Dofus row (type/color/description must be set manually in Studio)
    const { data: dofusRow, error: dofusError } = await client
      .from("dofus")
      .upsert(
        {
          name: tab.dofusName,
          slug: tab.dofusSlug,
          type: "primordial",
          color: "#4ade80",
          description: "",
          recommended_level: 0,
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (dofusError || !dofusRow) {
      report.errors.push(`Dofus upsert failed: ${dofusError?.message}`);
      return report;
    }

    const dofusId = dofusRow.id as string;

    // 2. Parse quest rows (skip row 0 = header)
    const dataRows = tab.rows.slice(1);



    let currentSection = "Prérequis";
    const parsedRows = [];

    for (const row of dataRows) {
      const sectionCell = row[0]?.trim();
      if (sectionCell) currentSection = sectionCell;
      const parsed = parseQuestRow(row, currentSection);
      if (parsed) parsedRows.push(parsed);
    }

    const rowsWithGroups = assignGroupIds(parsedRows);

    // 3. Upsert quests + chain entries in order
    // order_index is global across sections — db queries order by section first, then order_index
    let orderIndex = 0;
    for (const row of rowsWithGroups) {
      const slug = nameToSlug(row.name);

      const { data: questRow, error: questError } = await client
        .from("quests")
        .upsert(
          { name: row.name, slug, dofuspourlesnoobs_url: row.dofuspourlesnoobs_url },
          { onConflict: "slug" }
        )
        .select("id")
        .single();

      if (questError || !questRow) {
        report.errors.push(`Quest upsert failed for "${row.name}": ${questError?.message}`);
        continue;
      }

      const { error: chainError } = await client
        .from("dofus_quest_chains")
        .upsert(
          {
            dofus_id: dofusId,
            quest_id: questRow.id,
            section: row.section,
            order_index: orderIndex++,
            group_id: row.group_id,
            quest_types: row.quest_types,
            combat_count: row.combat_count,
            is_avoidable: row.is_avoidable,
          },
          { onConflict: "dofus_id,quest_id" }
        );

      if (chainError) {
        report.errors.push(`Chain upsert failed for "${row.name}": ${chainError.message}`);
        continue;
      }

      report.questsUpserted++;
    }

    // 4. Replace resources for this Dofus
    const parsedResources = parseResourceRows(dataRows);

    // Always delete existing resources (handles case where sheet now has none)
    const { error: deleteError } = await client.from("resources").delete().eq("dofus_id", dofusId);
    if (deleteError) {
      report.errors.push(`Resources delete failed: ${deleteError.message}`);
    } else if (parsedResources.length > 0) {
      const { error: resError } = await client
        .from("resources")
        .insert(parsedResources.map((r) => ({ ...r, dofus_id: dofusId })));

      if (resError) {
        report.errors.push(`Resources insert failed: ${resError.message}`);
      } else {
        report.resourcesUpserted = parsedResources.length;
      }
    }
  } catch (err) {
    report.errors.push(
      `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return report;
}
