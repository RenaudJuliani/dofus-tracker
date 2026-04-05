import { describe, it, expect } from "vitest";
import { parseQuestRow, parseHyperlink, type RawSheetRow } from "../parsers/quest-row-parser.js";

describe("parseHyperlink", () => {
  it("parses a HYPERLINK formula with semicolon separator", () => {
    const result = parseHyperlink('=HYPERLINK("https://dofuspourlesnoobs.com/kwisatz.html";"La Quête de Kwisatz")');
    expect(result).toEqual({
      url: "https://dofuspourlesnoobs.com/kwisatz.html",
      name: "La Quête de Kwisatz",
    });
  });

  it("parses a HYPERLINK formula with comma separator", () => {
    const result = parseHyperlink('=HYPERLINK("https://dofuspourlesnoobs.com/quest.html","Quest name")');
    expect(result).toEqual({
      url: "https://dofuspourlesnoobs.com/quest.html",
      name: "Quest name",
    });
  });

  it("returns null for plain text (not a HYPERLINK formula)", () => {
    expect(parseHyperlink("Quest name")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseHyperlink("")).toBeNull();
  });
});

describe("parseQuestRow", () => {
  it("parses a simple quest row with HYPERLINK formula", () => {
    // Column layout: [section, HYPERLINK(name+url), typesCell, groupMarker, combatCountCell, avoidableCell]
    const row: RawSheetRow = [
      "Prérequis",
      '=HYPERLINK("https://dofuspourlesnoobs.com/kwisatz.html";"La Quête de Kwisatz")',
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
    const row: RawSheetRow = [
      "",
      '=HYPERLINK("https://dofuspourlesnoobs.com/suite.html";"Suite de quête")',
      "donjon",
      "",
      "",
      "",
    ];
    const result = parseQuestRow(row, "Chaîne principale");
    expect(result?.section).toBe("main");
  });

  it("parses multiple quest types and combat count", () => {
    const row: RawSheetRow = [
      "Chaîne principale",
      '=HYPERLINK("https://dofuspourlesnoobs.com/combat-donjon.html";"Combat + Donjon")',
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
      '=HYPERLINK("https://dofuspourlesnoobs.com/groupe.html";"Quête groupée")',
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
    const prereqRow: RawSheetRow = [
      "Prérequis",
      '=HYPERLINK("https://dofuspourlesnoobs.com/q1.html";"Q1")',
      "succes",
      "",
      "",
      "",
    ];
    const mainRow: RawSheetRow = [
      "Chaîne principale",
      '=HYPERLINK("https://dofuspourlesnoobs.com/q2.html";"Q2")',
      "donjon",
      "",
      "",
      "",
    ];
    expect(parseQuestRow(prereqRow, "Prérequis")?.section).toBe("prerequisite");
    expect(parseQuestRow(mainRow, "Chaîne principale")?.section).toBe("main");
  });

  it("inherits section as 'prerequisite' when context is Prérequis", () => {
    const row: RawSheetRow = [
      "",
      '=HYPERLINK("https://dofuspourlesnoobs.com/suite-prereq.html";"Suite prérequis")',
      "combat_solo",
      "",
      "",
      "",
    ];
    const result = parseQuestRow(row, "Prérequis");
    expect(result?.section).toBe("prerequisite");
  });

  it("handles short rows (fewer than 7 columns) without throwing", () => {
    const row: RawSheetRow = [
      "Chaîne principale",
      '=HYPERLINK("https://dofuspourlesnoobs.com/ma-quete.html";"Ma quête")',
    ];
    const result = parseQuestRow(row, "Chaîne principale");
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Ma quête");
    expect(result?.quest_types).toEqual([]);
    expect(result?.group_marker).toBeNull();
    expect(result?.combat_count).toBeNull();
    expect(result?.is_avoidable).toBe(false);
  });

  it("falls back to row[1] plain text and generates URL when no HYPERLINK formula is present", () => {
    const row: RawSheetRow = ["Prérequis", "Plain text quest", "", "combat_solo", "", "", ""];
    const result = parseQuestRow(row, "Prérequis");
    expect(result?.name).toBe("Plain text quest");
    expect(result?.dofuspourlesnoobs_url).toBe("https://www.dofuspourlesnoobs.com/plain-text-quest.html");
  });
});
