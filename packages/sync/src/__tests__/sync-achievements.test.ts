import { describe, it, expect } from "vitest";
import { normalizeQuestName, extractQuestNameFromDescription } from "../sync-achievements.js";

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

describe("extractQuestNameFromDescription", () => {
  it("extrait le nom avec deux-points", () => {
    expect(extractQuestNameFromDescription("Terminer la quête : Et l'emmental ?")).toBe("Et l'emmental ?");
  });

  it("extrait le nom sans deux-points", () => {
    expect(extractQuestNameFromDescription("Terminer la quête Chaud du S.L.I.P.")).toBe("Chaud du S.L.I.P.");
  });

  it("fonctionne avec Compléter", () => {
    expect(extractQuestNameFromDescription("Compléter la quête : Épilogue hivernal")).toBe("Épilogue hivernal");
  });

  it("fonctionne avec Completer sans accent", () => {
    expect(extractQuestNameFromDescription("Completer la quête : Test")).toBe("Test");
  });

  it("est insensible à la casse", () => {
    expect(extractQuestNameFromDescription("TERMINER LA QUÊTE : Nom")).toBe("Nom");
  });

  it("retourne null si aucun pattern ne correspond", () => {
    expect(extractQuestNameFromDescription("Vaincre 10 monstres")).toBeNull();
    expect(extractQuestNameFromDescription("Atteindre le niveau 200")).toBeNull();
  });
});
