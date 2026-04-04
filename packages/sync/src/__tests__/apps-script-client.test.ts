import { describe, it, expect } from "vitest";
import { extractQuestsWithResources } from "../apps-script-client.js";
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
