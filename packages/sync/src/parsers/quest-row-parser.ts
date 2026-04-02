import type { QuestSection, QuestType } from "@dofus-tracker/types";

export type RawSheetRow = string[];

/** Parse =HYPERLINK("url";"name") or =HYPERLINK("url","name") formulas */
export function parseHyperlink(cell: string): { name: string; url: string } | null {
  const match = cell.match(/^=HYPERLINK\("([^"]+)"[;,]\s*"([^"]+)"\)$/i);
  if (!match) return null;
  return { url: match[1], name: match[2] };
}

export interface ParsedQuestRow {
  name: string;
  dofuspourlesnoobs_url: string | null;
  section: QuestSection;
  quest_types: QuestType[];
  group_marker: string | null;
  combat_count: number | null;
  is_avoidable: boolean;
}

const SECTION_MAP: Record<string, QuestSection> = {
  "Prérequis": "prerequisite",
  "Chaîne principale": "main",
};

const VALID_QUEST_TYPES = new Set<QuestType>([
  "combat_solo",
  "combat_groupe",
  "donjon",
  "metier",
  "boss",
  "succes",
  "horaires",
]);

export function parseQuestRow(
  row: RawSheetRow,
  currentSectionContext: string
): ParsedQuestRow | null {
  const [sectionCell, , typesCell, groupMarker, combatCountCell, avoidableCell] = row;

  // Find the HYPERLINK cell — quest name and URL are embedded in one formula
  const hyperlinkCell = row.find((cell) => cell?.startsWith("=HYPERLINK("));
  const hyperlink = hyperlinkCell ? parseHyperlink(hyperlinkCell) : null;
  const name = hyperlink?.name ?? row[1]?.trim(); // fallback to row[1] for plain text
  const url = hyperlink?.url ?? null;

  if (!name?.trim()) return null;

  const rawSection = sectionCell?.trim() || currentSectionContext;
  const mappedSection = SECTION_MAP[rawSection];
  if (mappedSection === undefined) {
    console.warn(`[quest-row-parser] Unknown section label: "${rawSection}", defaulting to "main"`);
  }
  const section: QuestSection = mappedSection ?? "main";

  const quest_types = (typesCell ?? "")
    .split(",")
    .map((t) => t.trim() as QuestType)
    .filter((t) => VALID_QUEST_TYPES.has(t));

  const combatCountRaw = combatCountCell?.trim();
  const parsed = combatCountRaw ? parseInt(combatCountRaw, 10) : null;
  const combat_count = parsed !== null && !isNaN(parsed) ? parsed : null;

  return {
    name: name.trim(),
    dofuspourlesnoobs_url: url?.trim() || null,
    section,
    quest_types,
    group_marker: groupMarker?.trim() || null,
    combat_count,
    is_avoidable: avoidableCell?.trim().toLowerCase() === "oui",
  };
}
