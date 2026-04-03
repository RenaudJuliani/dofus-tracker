import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQuestToggle } from "../src/hooks/useQuestToggle.js";
import type { QuestWithChain } from "@dofus-tracker/types";

const mockToggleQuestCompletion = vi.fn().mockResolvedValue(undefined);
const mockBulkCompleteSection = vi.fn().mockResolvedValue(undefined);
const mockGetQuestsForDofus = vi.fn().mockResolvedValue([]);

vi.mock("@dofus-tracker/db", () => ({
  toggleQuestCompletion: (...args: unknown[]) => mockToggleQuestCompletion(...args),
  bulkCompleteSection: (...args: unknown[]) => mockBulkCompleteSection(...args),
  getQuestsForDofus: (...args: unknown[]) => mockGetQuestsForDofus(...args),
}));

const fakeSupabase = {} as never;

function makeQuest(id: string, section: "prerequisite" | "main", completed = false): QuestWithChain {
  return {
    id,
    name: `Quest ${id}`,
    slug: id,
    dofuspourlesnoobs_url: null,
    created_at: "",
    chain: {
      id: `chain-${id}`,
      dofus_id: "dofus-1",
      quest_id: id,
      section,
      order_index: 1,
      group_id: null,
      quest_types: [],
      combat_count: null,
      is_avoidable: false,
    },
    is_completed: completed,
    shared_dofus_ids: [],
  };
}

describe("useQuestToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggles a quest optimistically", async () => {
    const setQuests = vi.fn();

    const { result } = renderHook(() =>
      useQuestToggle({
        supabase: fakeSupabase,
        characterId: "char-1",
        dofusId: "dofus-1",
        setQuests,
      })
    );

    await act(async () => {
      await result.current.handleToggle("q1", true);
    });

    expect(setQuests).toHaveBeenCalled();
    expect(mockToggleQuestCompletion).toHaveBeenCalledWith(
      fakeSupabase,
      "char-1",
      "q1",
      true
    );
  });

  it("does nothing when characterId is null", async () => {
    const setQuests = vi.fn();
    const { result } = renderHook(() =>
      useQuestToggle({
        supabase: fakeSupabase,
        characterId: null,
        dofusId: "dofus-1",
        setQuests,
      })
    );

    await act(async () => {
      await result.current.handleToggle("q1", true);
    });

    expect(setQuests).not.toHaveBeenCalled();
    expect(mockToggleQuestCompletion).not.toHaveBeenCalled();
  });

  it("rolls back on error", async () => {
    mockToggleQuestCompletion.mockRejectedValueOnce(new Error("network error"));
    const setQuests = vi.fn();

    const { result } = renderHook(() =>
      useQuestToggle({
        supabase: fakeSupabase,
        characterId: "char-1",
        dofusId: "dofus-1",
        setQuests,
      })
    );

    await act(async () => {
      await result.current.handleToggle("q1", true);
    });

    // Called twice: optimistic update + rollback
    expect(setQuests).toHaveBeenCalledTimes(2);
  });
});
