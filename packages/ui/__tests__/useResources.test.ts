import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useResources } from "../src/hooks/useResources.js";
import type { Resource } from "@dofus-tracker/types";

function makeResource(id: string, quantity: number, isKamas = false): Resource {
  return {
    id,
    name: `Resource ${id}`,
    icon_emoji: "💎",
    dofus_id: "dofus-1",
    quantity_per_character: quantity,
    is_kamas: isKamas,
  };
}

describe("useResources", () => {
  it("multiplier starts at 1", () => {
    const { result } = renderHook(() => useResources([]));
    expect(result.current.multiplier).toBe(1);
  });

  it("separates items from kamas", () => {
    const resources = [
      makeResource("r1", 10, false),
      makeResource("kamas", 5000, true),
    ];
    const { result } = renderHook(() => useResources(resources));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.kamas).toHaveLength(1);
    expect(result.current.items[0].id).toBe("r1");
    expect(result.current.kamas[0].id).toBe("kamas");
  });

  it("getQuantity multiplies by multiplier", () => {
    const resources = [makeResource("r1", 10)];
    const { result } = renderHook(() => useResources(resources));
    expect(result.current.getQuantity(resources[0])).toBe(10);

    act(() => result.current.setMultiplier(3));
    expect(result.current.getQuantity(resources[0])).toBe(30);
  });

  it("setMultiplier updates multiplier", () => {
    const { result } = renderHook(() => useResources([]));
    act(() => result.current.setMultiplier(5));
    expect(result.current.multiplier).toBe(5);
  });
});
