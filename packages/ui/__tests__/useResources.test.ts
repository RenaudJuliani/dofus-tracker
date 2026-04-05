import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useResources } from "../src/hooks/useResources.js";
import type { AggregatedResource } from "@dofus-tracker/types";

function makeResource(name: string, quantity: number, isKamas = false): AggregatedResource {
  return { name, quantity, is_kamas: isKamas };
}

describe("useResources", () => {
  it("multiplier starts at 1", () => {
    const { result } = renderHook(() => useResources([]));
    expect(result.current.multiplier).toBe(1);
  });

  it("separates items from kamas", () => {
    const resources = [
      makeResource("Plume", 10, false),
      makeResource("Kamas", 5000, true),
    ];
    const { result } = renderHook(() => useResources(resources));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.kamas).toHaveLength(1);
    expect(result.current.items[0].name).toBe("Plume");
    expect(result.current.kamas[0].name).toBe("Kamas");
  });

  it("getQuantity multiplies by multiplier", () => {
    const resources = [makeResource("Plume", 10)];
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
