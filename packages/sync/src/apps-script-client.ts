import type { QuestSection } from "@dofus-tracker/types";
import { nameToSlug } from "./utils.js";

export interface AppsScriptQuest {
  nom: string;
  termine: boolean;
  instruction: string;
  ressources: Array<{ nom: string; quantite: number }>;
}

export interface AppsScriptSubSection {
  titre: string;
  quetes: AppsScriptQuest[];
}

export interface AppsScriptSection {
  titre: string;
  sous_sections: AppsScriptSubSection[];
}

export interface AppsScriptData {
  metadata: { lastUpdate: string };
  dofus: Record<string, AppsScriptSection[]>;
}

export interface QuestWithResources {
  slug: string;
  resources: Array<{ name: string; quantity: number; is_kamas: boolean }>;
}

export interface QuestChainEntry {
  dofusName: string;
  dofusSlug: string;
  section: QuestSection;
  subSection: string | null;
  questName: string;
  questSlug: string;
  orderIndex: number;
  resources: Array<{ name: string; quantity: number; is_kamas: boolean }>;
}

const SECTION_MAP: Record<string, QuestSection> = {
  "Prérequis": "prerequisite",
  "Chaîne principale": "main",
  "Les quêtes": "main",
};

/** Fetch the Apps Script web endpoint and return parsed JSON */
export async function fetchAppsScriptData(url: string): Promise<AppsScriptData> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Apps Script fetch failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<AppsScriptData>;
}

/**
 * Flatten all Dofus/sections/sous_sections into a full ordered list of quests
 * with their chain metadata and resources.
 */
export function extractAllQuests(data: AppsScriptData): QuestChainEntry[] {
  const entries: QuestChainEntry[] = [];

  for (const [dofusName, sections] of Object.entries(data.dofus)) {
    const dofusSlug = nameToSlug(dofusName);
    let orderIndex = 0;

    for (const section of sections) {
      const sectionKey = section.titre?.trim() ?? "";
      const mappedSection: QuestSection = SECTION_MAP[sectionKey] ?? "main";

      for (const subSection of section.sous_sections) {
        // Sub-section titre may override the parent section (e.g. "Prérequis" as a sous-section of "Les quêtes")
        const subSectionKey = subSection.titre?.trim() ?? "";
        const effectiveSection: QuestSection = SECTION_MAP[subSectionKey] ?? mappedSection;

        for (const quest of subSection.quetes) {
          const name = quest.nom?.trim();
          if (!name || name === "toIgnore") continue;

          entries.push({
            dofusName,
            dofusSlug,
            section: effectiveSection,
            subSection: null, // overridden by sub-section-overrides.ts at sync time
            questName: name,
            questSlug: nameToSlug(name),
            orderIndex: orderIndex++,
            resources: quest.ressources.map((r) => ({
              name: r.nom,
              quantity: r.quantite,
              is_kamas: r.nom.toLowerCase() === "kamas",
            })),
          });
        }
      }
    }
  }

  return entries;
}

/**
 * Flatten all Dofus/sections/sous_sections into a deduplicated list of quests
 * that have at least one resource. Result is keyed by quest slug (one entry per
 * unique quest name across all Dofus).
 */
export function extractQuestsWithResources(data: AppsScriptData): QuestWithResources[] {
  const seen = new Map<string, QuestWithResources>();

  for (const sections of Object.values(data.dofus)) {
    for (const section of sections) {
      for (const sub of section.sous_sections) {
        for (const quest of sub.quetes) {
          if (quest.ressources.length === 0) continue;

          const slug = nameToSlug(quest.nom);
          if (seen.has(slug)) continue; // deduplicate by slug

          seen.set(slug, {
            slug,
            resources: quest.ressources.map((r) => ({
              name: r.nom,
              quantity: r.quantite,
              is_kamas: r.nom.toLowerCase() === "kamas",
            })),
          });
        }
      }
    }
  }

  return Array.from(seen.values());
}
