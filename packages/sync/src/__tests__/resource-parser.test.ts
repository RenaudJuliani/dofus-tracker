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
});
