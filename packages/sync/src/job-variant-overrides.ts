import { nameToSlug } from "./utils.js";
import type { JobVariant } from "@dofus-tracker/types";

interface JobVariantPair {
  alchimiste: string; // quest name (display)
  paysan: string;     // quest name (display)
}

const RAW_PAIRS: Array<{ dofusSlug: string; pairs: JobVariantPair[] }> = [
  {
    dofusSlug: "dofus-des-glaces",
    pairs: [
      { alchimiste: "Cent Vingt trois fleurs",               paysan: "En semant, se ment" },
      { alchimiste: "Botanique-nique-nique",                  paysan: "Pomdeupin vaut mieux que trois tu l'auras" },
      { alchimiste: "A fleur de peau",                        paysan: "Massacre au hakapik" },
      { alchimiste: "Mes lys fleurs",                         paysan: "Mettre son grain de sel" },
      { alchimiste: "Rose a lys, rose a lys, oh !",           paysan: "Mauvaise graine" },
      { alchimiste: "Fleuris mais rougissent",                paysan: "Champ pomy" },
      { alchimiste: "Heureux qui comme les lys",              paysan: "Gant graine" },
      { alchimiste: "Le nom de la mycose",                    paysan: "Les graines de la discorde" },
      { alchimiste: "Crocs n'en bourrent",                    paysan: "Le champ des heros" },
      { alchimiste: "Ville fleurie",                          paysan: "Champ borde le chateau" },
    ],
  },
];

// Lookup: dofusSlug → Map<questSlug, JobVariant>
const LOOKUP: ReadonlyMap<string, ReadonlyMap<string, JobVariant>> = (() => {
  const outer = new Map<string, Map<string, JobVariant>>();
  for (const entry of RAW_PAIRS) {
    const inner = new Map<string, JobVariant>();
    for (const pair of entry.pairs) {
      inner.set(nameToSlug(pair.alchimiste), "alchimiste");
      inner.set(nameToSlug(pair.paysan), "paysan");
    }
    outer.set(entry.dofusSlug, inner);
  }
  return outer;
})();

// Pairs lookup: dofusSlug → [{ alchimisteSlug, paysanSlug }]
const PAIRS_LOOKUP: ReadonlyMap<string, ReadonlyArray<{ alchimisteSlug: string; paysanSlug: string }>> = (() => {
  const outer = new Map<string, Array<{ alchimisteSlug: string; paysanSlug: string }>>();
  for (const entry of RAW_PAIRS) {
    outer.set(
      entry.dofusSlug,
      entry.pairs.map((p) => ({ alchimisteSlug: nameToSlug(p.alchimiste), paysanSlug: nameToSlug(p.paysan) }))
    );
  }
  return outer;
})();

export function getJobVariantOverride(dofusSlug: string, questSlug: string): JobVariant | null {
  return LOOKUP.get(dofusSlug)?.get(questSlug) ?? null;
}

export function getJobVariantPairs(
  dofusSlug: string
): ReadonlyArray<{ alchimisteSlug: string; paysanSlug: string }> {
  return PAIRS_LOOKUP.get(dofusSlug) ?? [];
}

export function getJobVariantOverrideSlugsForDofus(dofusSlug: string): string[] {
  return [...(LOOKUP.get(dofusSlug)?.keys() ?? [])];
}
