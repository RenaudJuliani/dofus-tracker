import { describe, it, expect } from "vitest";
import { normalizeQuestName } from "../sync-achievements.js";

describe("normalizeQuestName", () => {
  it("met en minuscules", () => {
    expect(normalizeQuestName("La Quête du Dragon")).toBe("la quête du dragon");
  });

  it("normalise les apostrophes typographiques", () => {
    expect(normalizeQuestName("L\u2019arm\u00e9e des glaces")).toBe("l'arm\u00e9e des glaces");
    expect(normalizeQuestName("L\u2018arm\u00e9e")).toBe("l'arm\u00e9e");
  });

  it("trim les espaces", () => {
    expect(normalizeQuestName("  test  ")).toBe("test");
  });

  it("collapse les espaces multiples", () => {
    expect(normalizeQuestName("la  quête  du  roi")).toBe("la quête du roi");
  });

  it("conserve les accents", () => {
    expect(normalizeQuestName("Épilogue hivernal")).toBe("épilogue hivernal");
  });
});
