import { describe, it, expect } from "vitest";
import { parseQuestRow, type RawSheetRow } from "../parsers/quest-row-parser.js";

describe("parseQuestRow", () => {
  it("parses a simple quest row", () => {
    const row: RawSheetRow = [
      "Prérequis",
      "La Quête de Kwisatz",
      "https://dofuspourlesnoobs.com/kwisatz.html",
      "combat_solo",
      "",
      "",
      "",
    ];
    const result = parseQuestRow(row, "Prérequis");
    expect(result).toEqual({
      name: "La Quête de Kwisatz",
      dofuspourlesnoobs_url: "https://dofuspourlesnoobs.com/kwisatz.html",
      section: "prerequisite",
      quest_types: ["combat_solo"],
      group_marker: null,
      combat_count: null,
      is_avoidable: false,
    });
  });

  it("inherits section from previous row when cell is empty", () => {
    const row: RawSheetRow = ["", "Suite de quête", "", "donjon", "", "", ""];
    const result = parseQuestRow(row, "Chaîne principale");
    expect(result?.section).toBe("main");
  });

  it("parses multiple quest types and combat count", () => {
    const row: RawSheetRow = [
      "Chaîne principale",
      "Combat + Donjon",
      "",
      "combat_groupe,donjon",
      "",
      "3",
      "",
    ];
    const result = parseQuestRow(row, "Chaîne principale");
    expect(result?.quest_types).toEqual(["combat_groupe", "donjon"]);
    expect(result?.combat_count).toBe(3);
  });

  it("parses group marker and avoidable flag", () => {
    const row: RawSheetRow = [
      "Chaîne principale",
      "Quête groupée",
      "",
      "combat_solo",
      "A",
      "",
      "oui",
    ];
    const result = parseQuestRow(row, "Chaîne principale");
    expect(result?.group_marker).toBe("A");
    expect(result?.is_avoidable).toBe(true);
  });

  it("returns null for empty rows (headers, separators)", () => {
    const row: RawSheetRow = ["", "", "", "", "", "", ""];
    expect(parseQuestRow(row, "Prérequis")).toBeNull();
  });

  it("maps section labels to section types correctly", () => {
    const prereqRow: RawSheetRow = ["Prérequis", "Q1", "", "succes", "", "", ""];
    const mainRow: RawSheetRow = ["Chaîne principale", "Q2", "", "donjon", "", "", ""];
    expect(parseQuestRow(prereqRow, "Prérequis")?.section).toBe("prerequisite");
    expect(parseQuestRow(mainRow, "Chaîne principale")?.section).toBe("main");
  });

  it("inherits section as 'prerequisite' when context is Prérequis", () => {
    const row: RawSheetRow = ["", "Suite prérequis", "", "combat_solo", "", "", ""];
    const result = parseQuestRow(row, "Prérequis");
    expect(result?.section).toBe("prerequisite");
  });

  it("handles short rows (fewer than 7 columns) without throwing", () => {
    const row: RawSheetRow = ["Chaîne principale", "Ma quête"];
    const result = parseQuestRow(row, "Chaîne principale");
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Ma quête");
    expect(result?.quest_types).toEqual([]);
    expect(result?.group_marker).toBeNull();
    expect(result?.combat_count).toBeNull();
    expect(result?.is_avoidable).toBe(false);
  });
});
