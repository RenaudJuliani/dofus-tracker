import { describe, it, expect } from "vitest";
import { assignGroupIds } from "../parsers/group-detector.js";
import type { ParsedQuestRow } from "../parsers/quest-row-parser.js";

function makeRow(overrides: Partial<ParsedQuestRow> = {}): ParsedQuestRow {
  return {
    name: "Quest",
    dofuspourlesnoobs_url: null,
    section: "main",
    quest_types: [],
    group_marker: null,
    combat_count: null,
    is_avoidable: false,
    ...overrides,
  };
}

describe("assignGroupIds", () => {
  it("assigns null group_id to rows with no group marker", () => {
    const result = assignGroupIds([makeRow(), makeRow()]);
    expect(result[0].group_id).toBeNull();
    expect(result[1].group_id).toBeNull();
  });

  it("assigns the same UUID to rows sharing a group marker", () => {
    const result = assignGroupIds([
      makeRow({ group_marker: "1" }),
      makeRow({ group_marker: "2" }),
      makeRow({ group_marker: "1" }),
    ]);
    expect(result[0].group_id).not.toBeNull();
    expect(result[0].group_id).toBe(result[2].group_id);
    expect(result[1].group_id).not.toBe(result[0].group_id);
  });

  it("assigns different UUIDs to different group markers", () => {
    const result = assignGroupIds([
      makeRow({ group_marker: "A" }),
      makeRow({ group_marker: "B" }),
    ]);
    expect(result[0].group_id).not.toBe(result[1].group_id);
  });

  it("group UUIDs are valid UUID v4 format", () => {
    const result = assignGroupIds([makeRow({ group_marker: "1" })]);
    expect(result[0].group_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
