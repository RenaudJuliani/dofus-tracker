import type { QuestSection, QuestType } from "@dofus-tracker/types";

export type RawSheetRow = string[];

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
  const [sectionCell, name, url, typesCell, groupMarker, combatCountCell, avoidableCell] = row;

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
