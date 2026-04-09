import { nameToSlug } from "./utils.js";

const RAW_OVERRIDES: Array<{
  dofusSlug: string;
  groups: Array<{ groupId: string; questNames: string[] }>;
}> = [
  {
    dofusSlug: "dofoozbz",
    groups: [
      {
        groupId: "dofoozbz-insects",
        questNames: [
          "Le vol des bourdons",
          "Des petites betes qui font bzzzbz",
          "Tetes de ponte",
          "Derive insectaire",
        ],
      },
      {
        groupId: "dofoozbz-verites",
        questNames: [
          "La proie des verites",
          "Quand on la cherche, on finit par tomber dessus",
          "Devoir de reserve",
        ],
      },
      {
        groupId: "dofoozbz-coeurs",
        questNames: [
          "Trois coeurs, un roi",
          "Un hote de marque",
          "L'union sacree",
        ],
      },
    ],
  },
  {
    dofusSlug: "dofus-abyssal",
    groups: [
      {
        groupId: "abyssal-kralab",
        questNames: [
          "Relevez les niveaux",
          "A bas kralab rah",
          "Ko pour bosko tho",
        ],
      },
      {
        groupId: "abyssal-voisins",
        questNames: [
          "Nos chairs voisines",
          "Le vieux gob et la mer",
        ],
      },
      {
        groupId: "abyssal-odeur",
        questNames: [
          "L'odeur devant le seuil",
          "Fhtagn",
        ],
      },
      {
        groupId: "abyssal-profondeurs",
        questNames: [
          "L'ivresse des profondeurs",
          "Les mercemers sont bien outilles",
          "Peche aux krabouilleurs",
        ],
      },
    ],
  },
  {
    dofusSlug: "dofus-argente",
    groups: [
      {
        groupId: "argente-pigment",
        questNames: [
          "Decime-moi des bouftous",
          "Un peu de pigment",
        ],
      },
      {
        groupId: "argente-donjon",
        questNames: [
          "Cryptologie",
          "Des chafers qui marchent",
          "Dans la gueule du milimulou",
        ],
      },
      {
        groupId: "argente-coupe",
        questNames: [
          "La coupe des vices",
          "Le genie se meut",
        ],
      },
      {
        groupId: "argente-prairie",
        questNames: [
          "La petite mission dans la prairie",
          "Livraison par interim",
        ],
      },
      {
        groupId: "argente-automne",
        questNames: [
          "Legende d'automne",
          "L'invasion des profanateurs de sepulture",
          "Le repos est dans le champs",
        ],
      },
    ],
  },
  {
    dofusSlug: "dofus-des-glaces",
    groups: [
      {
        groupId: "glaces-fleurs",
        questNames: [
          "Cent vingt trois fleus",
          "En semant, se ment",
          "Les monologues du vaccin",
          "Antiroyaliste",
        ],
      },
      {
        groupId: "glaces-ski",
        questNames: [
          "Star ski et dutch",
          "Epis d'Emi",
          "Hotel de glace",
        ],
      },
      {
        groupId: "glaces-botanique",
        questNames: [
          "Botanique-nique-nique",
          "Pomdeupin vaut mieux que trois tu l'auras",
          "Promenons-nous dans les bois",
        ],
      },
      {
        groupId: "glaces-fleur-peau",
        questNames: [
          "A fleur de peau",
          "Massacre au hakapik",
          "Peche en eaux gelees",
          "L'ombre et la glace",
          "Les joyeux de la couronne",
          "Les chasseurs",
          "La marche de l'Imperatrice",
        ],
      },
      {
        groupId: "glaces-lys1",
        questNames: [
          "Il prefere la mort en mer",
          "Mes lys fleurs",
          "Mettre son grain de sel",
          "Fais dodo, t'auras du gateau",
        ],
      },
      {
        groupId: "glaces-lys2",
        questNames: [
          "Chauffage a moindre frais",
          "Rose a lys, rose a lys, oh !",
          "Mauvaise graine",
        ],
      },
      {
        groupId: "glaces-lavy",
        questNames: [
          "A la recherche de dan lavy",
          "Fleuries mais rougissent",
          "Champ pomy",
          "Lavomatique",
        ],
      },
      {
        groupId: "glaces-boufmouth",
        questNames: [
          "A qui profite le boufmouth",
          "Heureux qui, comme les lys",
          "Gant graine",
          "C'est frais, mais c'est pas grave",
        ],
      },
      {
        groupId: "glaces-ravitaillement",
        questNames: [
          "Depot de ravitaillement",
          "Chaud du s.l.i.p.",
        ],
      },
      {
        groupId: "glaces-mycose",
        questNames: [
          "Le nom de la mycose",
          "Les graines de la discorde",
          "Sans ma barbe, quelle barbe",
        ],
      },
      {
        groupId: "glaces-crocs",
        questNames: [
          "Crocs n'en bourront",
          "Le champ des heros",
          "La-haut sur la montagne",
          "Un ami qui ne vous veut pas que du bien",
        ],
      },
      {
        groupId: "glaces-ville",
        questNames: [
          "Ville fleurie",
          "Champ borde le chateau",
          "Maya la belle",
          "Le pic qui glace",
          "Mission solution",
        ],
      },
      {
        groupId: "glaces-machine",
        questNames: [
          "La machine a demonter le temps",
          "Au fion du trou",
        ],
      },
      {
        groupId: "glaces-givre",
        questNames: [
          "Le givre des revelations",
          "Un comte de faits divers",
        ],
      },
    ],
  },
  {
    dofusSlug: "dofus-sylvestre",
    groups: [
      {
        groupId: "sylvestre-vaccin",
        questNames: [
          "Les monologues du vaccin",
          "Antiroyaliste",
        ],
      },
      {
        groupId: "sylvestre-ombre",
        questNames: [
          "L'ombre et la glace",
          "Les joyeux de la couronne",
          "Les chasseurs",
          "La marche de l'Imperatrice",
        ],
      },
      {
        groupId: "sylvestre-mort",
        questNames: [
          "Il prefere la mort en mer",
          "Fais dodo, t'auras du gateau",
        ],
      },
      {
        groupId: "sylvestre-lavy",
        questNames: [
          "A la recherche de dan lavy",
          "Lavomatique",
        ],
      },
      {
        groupId: "sylvestre-boufmouth",
        questNames: [
          "A qui profite le boufmouth",
          "C'est frais, mais c'est pas grave",
        ],
      },
      {
        groupId: "sylvestre-ravitaillement",
        questNames: [
          "Depot de ravitaillement",
          "Chaud du s.l.i.p.",
        ],
      },
    ],
  },
  {
    dofusSlug: "dofus-nebuleux",
    groups: [
      {
        groupId: "nebuleux-coffre",
        questNames: [
          "Tresorphelinat",
          "Elle va finir par se faire coffrer",
          "Pompe a fric",
        ],
      },
      {
        groupId: "nebuleux-defense",
        questNames: [
          "La meilleure defense, c'est l'attaque",
          "Crache test",
          "Dephorrestation",
        ],
      },
      {
        groupId: "nebuleux-phorr",
        questNames: [
          "Phorreurs dans la brume",
          "La quatrieme dimension",
        ],
      },
      {
        groupId: "nebuleux-roi",
        questNames: [
          "Un morceau de roi",
          "Coiffeur de genie",
          "Echantillonnage",
          "Touchez pas a grisebigle",
        ],
      },
      {
        groupId: "nebuleux-dettes",
        questNames: [
          "Reconnaissance de dettes",
          "Le silence est d'or",
        ],
      },
      {
        groupId: "nebuleux-seine",
        questNames: [
          "La seinoise",
          "Ca katche ou ca casse",
          "Faux-semblants",
        ],
      },
      {
        groupId: "nebuleux-troupiers",
        questNames: [
          "Les troupiers",
          "Viande fraiche",
          "Necrotiques, tiques, tiques",
        ],
      },
      {
        groupId: "nebuleux-epidemie",
        questNames: [
          "Epidemiologie",
          "La peche au poison",
          "Comme un poison dans l'eau",
        ],
      },
      {
        groupId: "nebuleux-sauce",
        questNames: [
          "Balance la sauce",
          "Memoires d'outre-tombe",
        ],
      },
      {
        groupId: "nebuleux-origines",
        questNames: [
          "Aux origines du mal",
          "C'est quoi ton 06",
          "Terminutor : le jugement de la machine",
        ],
      },
      {
        groupId: "nebuleux-failles",
        questNames: [
          "Failles spatio-temporelles",
          "Les voleurs de couleurs",
        ],
      },
      {
        groupId: "nebuleux-armee",
        questNames: [
          "L'armee des 12 dingues",
          "Demain ne meurt jamais",
          "Les visiteurs du futur",
        ],
      },
      {
        groupId: "nebuleux-verite",
        questNames: [
          "La verite est au fond du puits",
          "Les sables du temps",
        ],
      },
    ],
  },
  {
    dofusSlug: "dofus-ivoire",
    groups: [
      {
        groupId: "ivoire-betes",
        questNames: [
          "Nos amies les betes",
          "La valse des manuels",
          "Shyriiwook",
          "A armes egales",
        ],
      },
    ],
  },
  {
    dofusSlug: "dofus-vulbis",
    groups: [
      {
        groupId: "vulbis-optional",
        questNames: [
          "L'eternelle moisson",
          "Vert emeraude",
          "Pourpre profond",
          "Bleu turquoise",
          "Ocre d'ombre",
          "La derniere pierre",
          "Les couts du sort",
          "L'ombre et la proie",
          "Une ombre sur le tableau",
          "Un remede draconien",
          "Le dragon des forets",
        ],
      },
    ],
  },
  {
    dofusSlug: "dofus-pourpre",
    groups: [
      {
        groupId: "pourpre-lait",
        questNames: [
          "Il faut battre le lait quand il est chaud",
          "Regrets d'eternailes",
          "L'anneau de Tot",
        ],
      },
    ],
  },
  {
    dofusSlug: "dofus-cauchemar",
    groups: [
      {
        groupId: "cauchemar-servitude",
        questNames: [
          "Le navire aux esclaves",
          "Briser ses chaines",
          "Une boite pour les asservir tous",
        ],
      },
      {
        groupId: "cauchemar-misere",
        questNames: [
          "Le vent se leve",
          "Tournent les vents",
        ],
      },
      {
        groupId: "cauchemar-corruption",
        questNames: [
          "Les racines du mal",
          "Un pouvoir merydique",
        ],
      },
      {
        groupId: "cauchemar-donjons",
        questNames: [
          "Le jour le plus long",
          "Mort et renouveau",
          "Avis de tempete",
        ],
      },
      {
        groupId: "cauchemar-guerre",
        questNames: [
          "Au-dela de la gloire",
          "Voyage au bout de l'externam",
        ],
      },
    ],
  },
];

// Lookup: dofusSlug → Map<questSlug, groupId>
const LOOKUP: ReadonlyMap<string, ReadonlyMap<string, string>> = (() => {
  const outer = new Map<string, Map<string, string>>();
  for (const entry of RAW_OVERRIDES) {
    const inner = new Map<string, string>();
    for (const group of entry.groups) {
      for (const name of group.questNames) {
        inner.set(nameToSlug(name), group.groupId);
      }
    }
    outer.set(entry.dofusSlug, inner);
  }
  return outer;
})();

export function getGroupOverride(dofusSlug: string, questSlug: string): string | null {
  return LOOKUP.get(dofusSlug)?.get(questSlug) ?? null;
}
