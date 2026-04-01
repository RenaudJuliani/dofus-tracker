import type { RawSheetRow } from "./quest-row-parser.js";

export type { RawSheetRow };

export interface ParsedResourceRow {
  name: string;
  icon_emoji: string;
  quantity_per_character: number;
  is_kamas: boolean;
}

const COL_NAME = 8;
const COL_EMOJI = 9;
const COL_QTY = 10;
const COL_KAMAS = 11;

export function parseResourceRows(rows: RawSheetRow[]): ParsedResourceRow[] {
  const results: ParsedResourceRow[] = [];

  for (const row of rows) {
    const name = row[COL_NAME]?.trim();
    if (!name) continue;

    const icon_emoji = row[COL_EMOJI]?.trim() || "📦";
    const qtyRaw = row[COL_QTY]?.trim().replace(/\s/g, "");
    const qty = qtyRaw ? parseInt(qtyRaw, 10) : 1;

    results.push({
      name,
      icon_emoji,
      quantity_per_character: isNaN(qty) ? 1 : qty,
      is_kamas: row[COL_KAMAS]?.trim().toLowerCase() === "kamas",
    });
  }

  return results;
}
