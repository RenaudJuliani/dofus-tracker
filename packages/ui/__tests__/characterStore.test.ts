import { describe, it, expect, beforeEach } from "vitest";
import { createCharacterStore } from "../src/stores/characterStore.js";
import { createJSONStorage } from "zustand/middleware";

function makeStore() {
  const mem: Record<string, string> = {};
  const storage = {
    getItem: (k: string) => mem[k] ?? null,
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
  };
  return createCharacterStore(createJSONStorage(() => storage));
}

describe("characterStore", () => {
  it("activeCharacterId is null by default", () => {
    const store = makeStore();
    expect(store.getState().activeCharacterId).toBeNull();
  });

  it("setActiveCharacterId updates the active id", () => {
    const store = makeStore();
    store.getState().setActiveCharacterId("abc-123");
    expect(store.getState().activeCharacterId).toBe("abc-123");
  });

  it("setActiveCharacterId accepts null to deselect", () => {
    const store = makeStore();
    store.getState().setActiveCharacterId("abc-123");
    store.getState().setActiveCharacterId(null);
    expect(store.getState().activeCharacterId).toBeNull();
  });
});
