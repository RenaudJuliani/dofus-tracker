import { describe, it, expect, beforeEach, vi } from "vitest";

const store: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete store[key]; }),
  },
}));

const mockToggle = vi.fn();
vi.mock("@dofus-tracker/db", () => ({
  toggleQuestCompletion: (...args: unknown[]) => mockToggle(...args),
}));

import { addToQueue, getQueue, flushQueue } from "../offlineQueue";

const fakeSupabase = {} as never;

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  mockToggle.mockReset();
});

describe("offlineQueue", () => {
  it("queue is empty by default", async () => {
    expect(await getQueue()).toEqual([]);
  });

  it("addToQueue adds an action", async () => {
    await addToQueue({ questId: "q1", characterId: "c1", dofusId: "d1", completed: true });
    const q = await getQueue();
    expect(q).toHaveLength(1);
    expect(q[0].questId).toBe("q1");
    expect(q[0].completed).toBe(true);
  });

  it("addToQueue deduplicates by questId (last-write-wins)", async () => {
    await addToQueue({ questId: "q1", characterId: "c1", dofusId: "d1", completed: true });
    await addToQueue({ questId: "q1", characterId: "c1", dofusId: "d1", completed: false });
    const q = await getQueue();
    expect(q).toHaveLength(1);
    expect(q[0].completed).toBe(false);
  });

  it("flushQueue calls toggleQuestCompletion and clears queue on success", async () => {
    mockToggle.mockResolvedValue(undefined);
    await addToQueue({ questId: "q1", characterId: "c1", dofusId: "d1", completed: true });

    const onFlushed = vi.fn();
    await flushQueue(fakeSupabase, onFlushed);

    expect(mockToggle).toHaveBeenCalledWith(fakeSupabase, "c1", "q1", true);
    expect(onFlushed).toHaveBeenCalledWith(1);
    expect(await getQueue()).toHaveLength(0);
  });

  it("flushQueue stops and keeps remaining on network error", async () => {
    mockToggle.mockRejectedValue(new TypeError("Network request failed"));
    await addToQueue({ questId: "q1", characterId: "c1", dofusId: "d1", completed: true });

    const onFlushed = vi.fn();
    await flushQueue(fakeSupabase, onFlushed);

    expect(onFlushed).not.toHaveBeenCalled();
    expect(await getQueue()).toHaveLength(1);
  });

  it("flushQueue drops action on non-network error", async () => {
    mockToggle.mockRejectedValue(new Error("RLS policy violation"));
    await addToQueue({ questId: "q1", characterId: "c1", dofusId: "d1", completed: true });

    const onFlushed = vi.fn();
    await flushQueue(fakeSupabase, onFlushed);

    expect(await getQueue()).toHaveLength(0);
  });
});
