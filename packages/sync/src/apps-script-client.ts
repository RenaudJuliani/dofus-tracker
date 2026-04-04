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

/** Fetch the Apps Script web endpoint and return parsed JSON */
export async function fetchAppsScriptData(url: string): Promise<AppsScriptData> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Apps Script fetch failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<AppsScriptData>;
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
