import { describe, it, expect } from "vitest";
import {
  getJobVariantOverride,
  getJobVariantPairs,
  getJobVariantOverrideSlugsForDofus,
} from "../job-variant-overrides.js";

describe("getJobVariantOverride", () => {
  it("returns 'paysan' for a paysan quest slug on DDG", () => {
    expect(getJobVariantOverride("dofus-des-glaces", "en-semant-se-ment")).toBe("paysan");
  });

  it("returns 'alchimiste' for an alchimiste quest slug on DDG", () => {
    expect(getJobVariantOverride("dofus-des-glaces", "cent-vingt-trois-fleurs")).toBe("alchimiste");
  });

  it("returns null for an unknown quest", () => {
    expect(getJobVariantOverride("dofus-des-glaces", "quete-inconnue")).toBeNull();
  });

  it("returns null for an unknown dofus", () => {
    expect(getJobVariantOverride("dofus-inconnu", "en-semant-se-ment")).toBeNull();
  });
});

describe("getJobVariantPairs", () => {
  it("returns 10 pairs for DDG", () => {
    const pairs = getJobVariantPairs("dofus-des-glaces");
    expect(pairs).toHaveLength(10);
  });

  it("each pair has alchimisteSlug and paysanSlug", () => {
    const pairs = getJobVariantPairs("dofus-des-glaces");
    for (const pair of pairs) {
      expect(pair.alchimisteSlug).toMatch(/^[a-z0-9-]+$/);
      expect(pair.paysanSlug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("first pair is cent-vingt-trois-fleurs / en-semant-se-ment", () => {
    const pairs = getJobVariantPairs("dofus-des-glaces");
    expect(pairs[0].alchimisteSlug).toBe("cent-vingt-trois-fleurs");
    expect(pairs[0].paysanSlug).toBe("en-semant-se-ment");
  });

  it("returns empty array for unknown dofus", () => {
    expect(getJobVariantPairs("dofus-inconnu")).toEqual([]);
  });
});

describe("getJobVariantOverrideSlugsForDofus", () => {
  it("returns 20 slugs for DDG (10 alchi + 10 paysan)", () => {
    expect(getJobVariantOverrideSlugsForDofus("dofus-des-glaces")).toHaveLength(20);
  });
});
