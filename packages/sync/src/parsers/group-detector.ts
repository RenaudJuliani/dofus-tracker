import { randomUUID } from "crypto";
import type { ParsedQuestRow } from "./quest-row-parser.js";

export interface QuestRowWithGroupId extends ParsedQuestRow {
  group_id: string | null;
}

export function assignGroupIds(rows: ParsedQuestRow[]): QuestRowWithGroupId[] {
  const markerToUUID = new Map<string, string>();

  return rows.map((row) => {
    if (!row.group_marker) return { ...row, group_id: null };

    if (!markerToUUID.has(row.group_marker)) {
      markerToUUID.set(row.group_marker, randomUUID());
    }

    return { ...row, group_id: markerToUUID.get(row.group_marker)! };
  });
}
