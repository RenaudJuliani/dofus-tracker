import { nameToSlug } from "./utils.js";

/**
 * Manual overrides for dofuspourlesnoobs_url when the auto-generated URL
 * (based on nameToSlug) doesn't match the actual page on dofuspourlesnoobs.com.
 *
 * This happens when:
 *  - The spreadsheet quest name differs from the website page title
 *  - The website URL uses HTML-entity encoding for accented chars (è→egrave, î→icirc…)
 *
 * Key: nameToSlug(questName)  →  Value: full correct URL
 */
const RAW_OVERRIDES: Array<{ questName: string; url: string }> = [
  {
    questName: "La serveuse Dame Cloude",
    url: "https://www.dofuspourlesnoobs.com/la-tenanciegravere-dame-cloude.html",
  },
  {
    questName: "Entrainement avec Tarche",
    url: "https://www.dofuspourlesnoobs.com/entraicircnement-avec-tarche.html",
  },
];

const URL_LOOKUP = new Map<string, string>(
  RAW_OVERRIDES.map((o) => [nameToSlug(o.questName), o.url])
);

/**
 * Returns the correct dofuspourlesnoobs URL for a quest if an override exists,
 * otherwise returns null (auto-generation will be used).
 */
export function getUrlOverride(questSlug: string): string | null {
  return URL_LOOKUP.get(questSlug) ?? null;
}
