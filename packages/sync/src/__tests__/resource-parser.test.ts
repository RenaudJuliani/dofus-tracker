import { describe, it, expect } from "vitest";
import { parseResourceRows, type RawSheetRow } from "../parsers/resource-parser.js";

describe("parseResourceRows", () => {
  it("parses a list of resource rows", () => {
    const rows: RawSheetRow[] = [
      ["", "", "", "", "", "", "", "", "Écaille de Dragon", "🐉", "100", ""],
      ["", "", "", "", "", "", "", "", "Cristal de Sel", "💎", "50", ""],
    ];
    expect(parseResourceRows(rows)).toEqual([
      { name: "Écaille de Dragon", icon_emoji: "🐉", quantity_per_character: 100, is_kamas: false },
      { name: "Cristal de Sel", icon_emoji: "💎", quantity_per_character: 50, is_kamas: false },
    ]);
  });

  it("marks kamas row", () => {
    const rows: RawSheetRow[] = [
      ["", "", "", "", "", "", "", "", "Kamas", "💰", "1000000", "kamas"],
    ];
    expect(parseResourceRows(rows)[0].is_kamas).toBe(true);
  });

  it("uses default emoji when emoji cell is empty", () => {
    const rows: RawSheetRow[] = [
      ["", "", "", "", "", "", "", "", "Ressource", "", "10", ""],
    ];
    expect(parseResourceRows(rows)[0].icon_emoji).toBe("📦");
  });

  it("skips rows with no resource name", () => {
    const rows: RawSheetRow[] = [
      ["", "", "", "", "", "", "", "", "", "", "", ""],
    ];
    expect(parseResourceRows(rows)).toHaveLength(0);
  });

  it("defaults quantity to 1 when quantity cell is missing", () => {
    const rows: RawSheetRow[] = [
      ["", "", "", "", "", "", "", "", "Ressource", "📦"],  // only 10 columns, no qty
    ];
    expect(parseResourceRows(rows)[0].quantity_per_character).toBe(1);
  });

  it("handles short rows without throwing", () => {
    const rows: RawSheetRow[] = [
      ["", "", "", "", "", "", "", "", "Ressource"],  // only 9 columns
    ];
    const result = parseResourceRows(rows);
    expect(result).toHaveLength(1);
    expect(result[0].is_kamas).toBe(false);
  });
});
