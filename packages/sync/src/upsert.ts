import type { SupabaseClient } from "@supabase/supabase-js";
import { parseQuestRow, SECTION_MAP, type ParsedQuestRow } from "./parsers/quest-row-parser.js";
import { getDofusType } from "./dofus-type.js";

type ParsedWithSubSection = ParsedQuestRow & { sub_section: string | null };
import { assignGroupIds } from "./parsers/group-detector.js";
import type { SheetTab } from "./sheets-client.js";
import { nameToSlug } from "./utils.js";

export interface SyncReport {
  dofusName: string;
  questsUpserted: number;
  errors: string[];
}

export async function syncTabToSupabase(
  tab: SheetTab,
  client: SupabaseClient
): Promise<SyncReport> {
  const report: SyncReport = {
    dofusName: tab.dofusName,
    questsUpserted: 0,
    errors: [],
  };

  try {
    const { data: dofusRow, error: dofusError } = await client
      .from("dofus")
      .upsert(
        {
          name: tab.dofusName,
          slug: tab.dofusSlug,
          type: getDofusType(tab.dofusSlug),
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

    const dataRows = tab.rows.slice(1);

    let currentSection = "Prérequis";
    let currentSubSection: string | null = null;
    const parsedRows: ParsedWithSubSection[] = [];

    for (const row of dataRows) {
      const sectionInRow = row.map((c) => c?.trim()).find((c) => !!c && c in SECTION_MAP);
      if (sectionInRow) {
        currentSection = sectionInRow;
        currentSubSection = null;
        continue;
      }

      const hasHyperlink = row.some(
        (c) => typeof c === "string" && c.toLowerCase().startsWith("=hyperlink(")
      );
      const hasPlainTextName = !hasHyperlink && typeof row[1] === "string" && row[1].trim().length > 0;

      if (hasHyperlink || hasPlainTextName) {
        const parsed = parseQuestRow(row, currentSection);
        if (parsed) parsedRows.push({ ...parsed, sub_section: currentSubSection });
        continue;
      }

      // Sub-section marker: text in row[0], row[1] empty
      if (SECTION_MAP[currentSection] === "main") {
        const textCell = row.map((c) => c?.trim()).find((c) => !!c);
        if (textCell) currentSubSection = textCell;
      }
    }

    const rowsWithGroups = assignGroupIds(parsedRows) as Array<
      ReturnType<typeof assignGroupIds>[number] & { sub_section: string | null }
    >;

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
            sub_section: row.sub_section,
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
  } catch (err) {
    report.errors.push(
      `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return report;
}
