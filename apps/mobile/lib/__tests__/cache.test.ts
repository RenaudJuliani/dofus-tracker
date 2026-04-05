import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage
const store: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete store[key]; }),
  },
}));

import { readCache, writeCache } from "../cache";

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

describe("cache", () => {
  it("returns null when key absent", async () => {
    expect(await readCache("missing")).toBeNull();
  });

  it("writes and reads back data", async () => {
    await writeCache("key", { foo: "bar" });
    expect(await readCache("key")).toEqual({ foo: "bar" });
  });

  it("returns null when TTL expired", async () => {
    await writeCache("key", "value");
    const raw = store["key"];
    const entry = JSON.parse(raw);
    entry.cachedAt = Date.now() - 1000 * 60 * 60 * 25; // 25h ago
    store["key"] = JSON.stringify(entry);

    expect(await readCache("key", 1000 * 60 * 60 * 24)).toBeNull();
  });

  it("returns data within TTL", async () => {
    await writeCache("key", "value");
    expect(await readCache("key", 1000 * 60 * 60 * 24)).toBe("value");
  });
});
