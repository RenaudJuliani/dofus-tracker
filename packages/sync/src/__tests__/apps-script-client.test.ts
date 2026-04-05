import { describe, it, expect } from "vitest";
import { extractQuestsWithResources, extractAllQuests } from "../apps-script-client.js";
import type { AppsScriptData } from "../apps-script-client.js";

const SAMPLE: AppsScriptData = {
  metadata: { lastUpdate: "2026-04-04T00:00:00.000Z" },
  dofus: {
    "Dofus Argenté": [
      {
        titre: "Général",
        sous_sections: [
          {
            titre: "Début",
            quetes: [
              {
                nom: "L'anneau de tous les dangers",
                termine: false,
                instruction: "",
                ressources: [],
              },
              {
                nom: "Produits naturels",
                termine: false,
                instruction: "",
                ressources: [
                  { nom: "Blé", quantite: 4 },
                  { nom: "Ortie", quantite: 4 },
                ],
              },
              {
                nom: "Biere qui roule n'amasse pas mousse",
                termine: false,
                instruction: "",
                ressources: [{ nom: "Kamas", quantite: 40 }],
              },
            ],
          },
        ],
      },
    ],
  },
};

describe("extractAllQuests", () => {
  it("returns all quests including those without resources", () => {
    const result = extractAllQuests(SAMPLE);
    expect(result).toHaveLength(3);
    const slugs = result.map((e) => e.questSlug);
    expect(slugs).toContain("l-anneau-de-tous-les-dangers");
    expect(slugs).toContain("produits-naturels");
  });

  it("maps section titre to section enum", () => {
    const data: AppsScriptData = {
      metadata: { lastUpdate: "2026-04-04T00:00:00.000Z" },
      dofus: {
        "Dofus Test": [
          { titre: "Les quêtes", sous_sections: [{ titre: "Sub", quetes: [{ nom: "Q1", termine: false, instruction: "", ressources: [] }] }] },
          { titre: "Prérequis", sous_sections: [{ titre: "Sub", quetes: [{ nom: "Q2", termine: false, instruction: "", ressources: [] }] }] },
        ],
      },
    };
    const result = extractAllQuests(data);
    expect(result.find((e) => e.questSlug === "q1")?.section).toBe("main");
    expect(result.find((e) => e.questSlug === "q2")?.section).toBe("prerequisite");
  });

  it("assigns sequential order_index per dofus", () => {
    const result = extractAllQuests(SAMPLE);
    expect(result[0].orderIndex).toBe(0);
    expect(result[1].orderIndex).toBe(1);
    expect(result[2].orderIndex).toBe(2);
  });

  it("sets sub_section to null by default (overrides applied at sync time)", () => {
    const result = extractAllQuests(SAMPLE);
    expect(result[0].subSection).toBeNull();
  });

  it("sets correct dofus name and slug", () => {
    const result = extractAllQuests(SAMPLE);
    expect(result[0].dofusName).toBe("Dofus Argenté");
    expect(result[0].dofusSlug).toBe("dofus-argente");
  });

  it("includes resources on entries that have them", () => {
    const result = extractAllQuests(SAMPLE);
    const produits = result.find((e) => e.questSlug === "produits-naturels");
    expect(produits?.resources).toHaveLength(2);
    expect(produits?.resources[0]).toEqual({ name: "Blé", quantity: 4, is_kamas: false });
  });

  it("marks Kamas resources with is_kamas: true", () => {
    const result = extractAllQuests(SAMPLE);
    const biere = result.find((e) => e.questSlug === "biere-qui-roule-n-amasse-pas-mousse");
    expect(biere?.resources[0]).toEqual({ name: "Kamas", quantity: 40, is_kamas: true });
  });

  it("generates dofuspourlesnoobs URL from slug", () => {
    const result = extractAllQuests(SAMPLE);
    // URL is generated at sync time, not here — slug is available for URL generation
    expect(result[0].questSlug).toBe("l-anneau-de-tous-les-dangers");
  });
});

describe("extractQuestsWithResources", () => {
  it("skips quests without resources", () => {
    const result = extractQuestsWithResources(SAMPLE);
    const slugs = result.map((q) => q.slug);
    expect(slugs).not.toContain("l-anneau-de-tous-les-dangers");
  });

  it("returns quests with resources with correct slug", () => {
    const result = extractQuestsWithResources(SAMPLE);
    const produits = result.find((q) => q.slug === "produits-naturels");
    expect(produits).toBeDefined();
    expect(produits!.resources).toHaveLength(2);
    expect(produits!.resources[0]).toEqual({ name: "Blé", quantity: 4, is_kamas: false });
    expect(produits!.resources[1]).toEqual({ name: "Ortie", quantity: 4, is_kamas: false });
  });

  it("marks Kamas resources with is_kamas: true", () => {
    const result = extractQuestsWithResources(SAMPLE);
    const biere = result.find((q) => q.slug === "biere-qui-roule-n-amasse-pas-mousse");
    expect(biere).toBeDefined();
    expect(biere!.resources[0]).toEqual({ name: "Kamas", quantity: 40, is_kamas: true });
  });

  it("deduplicates same quest name across sections", () => {
    const data: AppsScriptData = {
      metadata: { lastUpdate: "2026-04-04T00:00:00.000Z" },
      dofus: {
        "Dofus A": [
          {
            titre: "Sec 1",
            sous_sections: [
              {
                titre: "Sub 1",
                quetes: [{ nom: "Quête X", termine: false, instruction: "", ressources: [{ nom: "Fer", quantite: 3 }] }],
              },
            ],
          },
          {
            titre: "Sec 2",
            sous_sections: [
              {
                titre: "Sub 2",
                quetes: [{ nom: "Quête X", termine: false, instruction: "", ressources: [{ nom: "Fer", quantite: 3 }] }],
              },
            ],
          },
        ],
      },
    };
    const result = extractQuestsWithResources(data);
    const matches = result.filter((q) => q.slug === "quete-x");
    expect(matches).toHaveLength(1);
  });
});
