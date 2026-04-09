import type { SupabaseClient } from "@supabase/supabase-js";
import { extractAllQuests, type AppsScriptData } from "./apps-script-client.js";
import { getSubSection } from "./sub-section-overrides.js";
import { getAlignmentOverride, getAlignmentOverrideSlugsForDofus } from "./alignment-overrides.js";
import { getJobVariantOverride, getJobVariantPairs } from "./job-variant-overrides.js";
import { getUrlOverride } from "./url-overrides.js";
import { getGroupOverride } from "./group-overrides.js";
import { getNoteOverride } from "./quest-note-overrides.js";
import { getDofusType } from "./dofus-type.js";

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
        { name: dofusName, slug: dofusSlug, type: getDofusType(dofusSlug), color: "#4ade80", description: "", recommended_level: 0 },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (dofusError || !dofusRow) {
      report.errors.push(`Dofus upsert failed for "${dofusName}": ${dofusError?.message}`);
      continue;
    }

    const dofusId = dofusRow.id as string;
    const upsertedQuestIds: string[] = [];
    const questIdsWithResources: string[] = [];
    const resourceRows: Array<{ quest_id: string; name: string; quantity: number; is_kamas: boolean }> = [];

    // 2. Upsert each quest + chain
    for (const entry of dofusEntries) {
      const dofuspourlesnoobs_url =
        getUrlOverride(entry.questSlug) ??
        `https://www.dofuspourlesnoobs.com/${entry.questSlug}.html`;

      const { data: questRow, error: questError } = await client
        .from("quests")
        .upsert(
          {
            name: entry.questName,
            slug: entry.questSlug,
            dofuspourlesnoobs_url,
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
      upsertedQuestIds.push(questId);

      const subSection = getSubSection(entry.dofusSlug, entry.questSlug);
      const alignmentOverride = getAlignmentOverride(entry.dofusSlug, entry.questSlug);
      const jobVariantOverride = getJobVariantOverride(entry.dofusSlug, entry.questSlug);
      const groupOverride = getGroupOverride(dofusSlug, entry.questSlug);
      const noteOverride = getNoteOverride(dofusSlug, entry.questSlug);

      const { error: chainError } = await client
        .from("dofus_quest_chains")
        .upsert(
          {
            dofus_id: dofusId,
            quest_id: questId,
            section: entry.section,
            sub_section: subSection,
            order_index: entry.orderIndex,
            group_id: groupOverride,
            note: noteOverride,
            quest_types: [],
            combat_count: null,
            is_avoidable: false,
            alignment: alignmentOverride?.alignment ?? null,
            alignment_order: alignmentOverride?.alignmentOrder ?? null,
            job_variant: jobVariantOverride ?? null,
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

    // 3. Ensure alignment-override quests exist as chains even if absent from the Sheet
    const overrideSlugs = getAlignmentOverrideSlugsForDofus(dofusSlug);
    if (overrideSlugs.length > 0) {
      const { data: overrideQuests } = await client
        .from("quests")
        .select("id, slug")
        .in("slug", overrideSlugs);

      for (const oq of overrideQuests ?? []) {
        const alreadyUpserted = upsertedQuestIds.includes(oq.id);
        const alignmentEntry = getAlignmentOverride(dofusSlug, oq.slug)!;

        if (!alreadyUpserted) {
          // Quest not in Sheet for this dofus — insert with a high order_index so it lands at the end
          const subSection = getSubSection(dofusSlug, oq.slug);
          const section = subSection?.startsWith("Prérequis") ? "prerequisite" : "main";
          const { error: extraChainError } = await client
            .from("dofus_quest_chains")
            .upsert(
              {
                dofus_id: dofusId,
                quest_id: oq.id,
                section,
                sub_section: subSection ?? null,
                order_index: 9000 + overrideSlugs.indexOf(oq.slug),
                group_id: null,
                quest_types: [],
                combat_count: null,
                is_avoidable: false,
                alignment: alignmentEntry.alignment,
                alignment_order: alignmentEntry.alignmentOrder ?? null,
              },
              { onConflict: "dofus_id,quest_id" }
            );
          if (extraChainError) {
            report.errors.push(`Alignment chain upsert failed for "${oq.slug}" on "${dofusName}": ${extraChainError.message}`);
          }
        } else {
          // Quest is in Sheet — alignment already set during normal upsert, nothing extra needed
        }
        // Protect from stale cleanup regardless
        if (!upsertedQuestIds.includes(oq.id)) {
          upsertedQuestIds.push(oq.id);
        }
      }
    }

    // 3b. Ensure alchimiste chains exist, inheriting order_index from paysan counterpart
    const jobPairs = getJobVariantPairs(dofusSlug);
    if (jobPairs.length > 0) {
      for (const pair of jobPairs) {
        // Find paysan chain to inherit its position
        const { data: paysanQuestRow } = await client
          .from("quests")
          .select("id")
          .eq("slug", pair.paysanSlug)
          .maybeSingle();
        if (!paysanQuestRow) continue;

        const { data: paysanChain } = await client
          .from("dofus_quest_chains")
          .select("order_index, section, sub_section")
          .eq("dofus_id", dofusId)
          .eq("quest_id", paysanQuestRow.id)
          .maybeSingle();
        if (!paysanChain) continue;

        // Find or create the alchimiste quest row
        let alchimisteQuestId: string | null = null;
        const { data: existingAlchi } = await client
          .from("quests")
          .select("id")
          .eq("slug", pair.alchimisteSlug)
          .maybeSingle();

        if (existingAlchi) {
          alchimisteQuestId = existingAlchi.id;
        } else {
          const displayName = pair.alchimisteSlug
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          const { data: newQuest, error: newQuestError } = await client
            .from("quests")
            .insert({
              name: displayName,
              slug: pair.alchimisteSlug,
              dofuspourlesnoobs_url: `https://www.dofuspourlesnoobs.com/${pair.alchimisteSlug}.html`,
            })
            .select("id")
            .single();
          if (newQuestError || !newQuest) {
            report.errors.push(`Failed to create alchimiste quest "${pair.alchimisteSlug}": ${newQuestError?.message}`);
            continue;
          }
          alchimisteQuestId = newQuest.id;
        }

        // Upsert alchimiste chain at the same position as paysan
        const alchiGroupOverride = getGroupOverride(dofusSlug, pair.alchimisteSlug);
        const { error: alchiChainError } = await client
          .from("dofus_quest_chains")
          .upsert(
            {
              dofus_id: dofusId,
              quest_id: alchimisteQuestId,
              section: paysanChain.section,
              sub_section: paysanChain.sub_section,
              order_index: paysanChain.order_index,
              group_id: alchiGroupOverride,
              quest_types: [],
              combat_count: null,
              is_avoidable: false,
              alignment: null,
              alignment_order: null,
              job_variant: "alchimiste",
            },
            { onConflict: "dofus_id,quest_id" }
          );
        if (alchiChainError) {
          report.errors.push(`Alchimiste chain upsert failed for "${pair.alchimisteSlug}": ${alchiChainError.message}`);
        } else if (alchimisteQuestId && !upsertedQuestIds.includes(alchimisteQuestId)) {
          upsertedQuestIds.push(alchimisteQuestId);
          report.questsUpserted++;
        }
      }
    }

    // 4. Delete stale chains (quests removed from source, not protected by alignment overrides)
    if (upsertedQuestIds.length > 0) {
      const { error: staleError } = await client
        .from("dofus_quest_chains")
        .delete()
        .eq("dofus_id", dofusId)
        .not("quest_id", "in", `(${upsertedQuestIds.join(",")})`);
      if (staleError) {
        report.errors.push(`Stale chain cleanup failed for "${dofusName}": ${staleError.message}`);
      }
    }

    // 4. Replace resources for this dofus in bulk
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
