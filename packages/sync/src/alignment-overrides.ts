import type { Alignment, AlignmentOrder } from "@dofus-tracker/types";
import { nameToSlug } from "./utils.js";

interface AlignmentEntry {
  alignment: Alignment;
  alignmentOrder?: AlignmentOrder;
}

const RAW_OVERRIDES: Array<{
  dofusSlug: string;
  quests: Array<{ questName: string } & AlignmentEntry>;
}> = [
  // ---------------------------------------------------------------
  // Dofus des Glaces
  // ---------------------------------------------------------------
  {
    dofusSlug: "dofus-des-glaces",
    quests: [
      { questName: "La rivalite", alignment: "neutre" },
      { questName: "Entrainement avec Tarche", alignment: "bontarien" },
      { questName: "La destinee", alignment: "bontarien" },
      { questName: "Cliquetis fou", alignment: "brakmarien" },
      { questName: "La fatalite", alignment: "brakmarien" },
    ],
  },

  // ---------------------------------------------------------------
  // Dofus Sylvestre
  // ---------------------------------------------------------------
  {
    dofusSlug: "dofus-sylvestre",
    quests: [
      { questName: "La rivalite", alignment: "neutre" },
      { questName: "Entrainement avec Tarche", alignment: "bontarien" },
      { questName: "La destinee", alignment: "bontarien" },
      { questName: "Cliquetis fou", alignment: "brakmarien" },
      { questName: "La fatalite", alignment: "brakmarien" },
    ],
  },

  // ---------------------------------------------------------------
  // Dofus Ivoire — chaîne Bonta (100 quêtes)
  // ---------------------------------------------------------------
  {
    dofusSlug: "dofus-ivoire",
    quests: [
      // — Bonta —
      { questName: "Entrainement avec Tarche", alignment: "bontarien" },
      { questName: "La serveuse Dame Cloude", alignment: "bontarien" },
      { questName: "Du pain pour les braves", alignment: "bontarien" },
      { questName: "Ned le dentiste", alignment: "bontarien" },
      { questName: "Entrainement avec Torche", alignment: "bontarien" },
      { questName: "Cartes spéciales d'Amayiro", alignment: "bontarien" },
      { questName: "A vol d'oiseau", alignment: "bontarien" },
      { questName: "Pas de fainéants dans les rangs", alignment: "bontarien" },
      { questName: "Premiere visite a Brakmar", alignment: "bontarien" },
      { questName: "Un sanglier un peu trop agressif", alignment: "bontarien" },
      { questName: "Du repos mais pas trop", alignment: "bontarien" },
      { questName: "Recouvrement de dette à la Tabasse", alignment: "bontarien" },
      { questName: "Pot l'agent double", alignment: "bontarien" },
      { questName: "De la poudre aux yeux de Brâkmar", alignment: "bontarien" },
      { questName: "Une breche à Bonta", alignment: "bontarien" },
      { questName: "D'egouts temps", alignment: "bontarien" },
      { questName: "L'elite squelettique", alignment: "bontarien" },
      { questName: "La foire du Trool suspectee", alignment: "bontarien" },
      { questName: "Le Tabi d'Amayiro", alignment: "bontarien" },
      { questName: "Le fantôme de Tsog", alignment: "bontarien" },
      { questName: "Des anneaux sur le bout des doigts", alignment: "bontarien" },
      { questName: "La fureur du Holbaid", alignment: "bontarien" },
      { questName: "Des capes Bontariennes", alignment: "bontarien" },
      { questName: "Corvee de patate", alignment: "bontarien" },
      { questName: "Lyeno, Abraknyde malgre lui", alignment: "bontarien" },
      { questName: "Au service de Danathor", alignment: "bontarien" },
      { questName: "Amayiro à l'ombre du Champo", alignment: "bontarien" },
      { questName: "Le deces de Rimaraf", alignment: "bontarien" },
      { questName: "Poison de scorbute pour la prison", alignment: "bontarien" },
      { questName: "Dike Tarak, la menace", alignment: "bontarien" },
      { questName: "Des combats pas tres legaux", alignment: "bontarien" },
      { questName: "Mission de reconnaissance au cimetiere", alignment: "bontarien" },
      { questName: "Vengeance par procuration", alignment: "bontarien" },
      { questName: "La lettre anonyme", alignment: "bontarien" },
      { questName: "Tabi t'a fleuri", alignment: "bontarien" },
      { questName: "Des badges pour la bonne cause", alignment: "bontarien" },
      { questName: "Lecon de cuisine", alignment: "bontarien" },
      { questName: "Ras le bol de Lenglad", alignment: "bontarien" },
      { questName: "Dapyus n'est pas doue", alignment: "bontarien" },
      { questName: "C'est stupefiant", alignment: "bontarien" },
      { questName: "Vin diou", alignment: "bontarien" },
      { questName: "Les Ecas ne flippent pas", alignment: "bontarien" },
      { questName: "Plaine de chats", alignment: "bontarien" },
      { questName: "A l'endroit, à l'envers", alignment: "bontarien" },
      { questName: "Dans la gueule du chacha", alignment: "bontarien" },
      { questName: "Alimentaire mon cher", alignment: "bontarien" },
      { questName: "Bouc a misere", alignment: "bontarien" },
      { questName: "Flagrant delire", alignment: "bontarien" },
      { questName: "Quand y'en a marre de brakmar", alignment: "bontarien" },
      { questName: "La capture", alignment: "bontarien" },
      { questName: "Le port salue", alignment: "bontarien" },
      { questName: "L'equipe ment", alignment: "bontarien" },
      { questName: "Une partie de cache-cache", alignment: "bontarien" },
      { questName: "Pour vivre heureux", alignment: "bontarien" },
      { questName: "La tactique des gens d'armes", alignment: "bontarien" },
      { questName: "La panoplie du milicien", alignment: "bontarien" },
      { questName: "Ambition ambigue", alignment: "bontarien" },
      { questName: "Traknar", alignment: "bontarien" },
      { questName: "La Grafioze", alignment: "bontarien" },
      { questName: "Attaque a retardement", alignment: "bontarien" },
      { questName: "Une rumeur interessante", alignment: "bontarien" },
      { questName: "Investigations a moon", alignment: "bontarien" },
      { questName: "Maniere douce", alignment: "bontarien" },
      { questName: "Histoires de tortues", alignment: "bontarien" },
      { questName: "Bandanarthrie", alignment: "bontarien" },
      { questName: "Course-poursuite", alignment: "bontarien" },
      { questName: "A la poursuite d'octolliard rouge", alignment: "bontarien" },
      { questName: "Une corne edfrit sans sel", alignment: "bontarien" },
      { questName: "Un sombre pouvoir", alignment: "bontarien" },
      { questName: "Le subterfuge de la corne", alignment: "bontarien" },
      { questName: "Un coupable ideal", alignment: "bontarien" },
      { questName: "Un peu de juge hot", alignment: "bontarien" },
      { questName: "De drôles de témoins", alignment: "bontarien" },
      { questName: "Sram d'egoutant", alignment: "bontarien" },
      { questName: "Si j'avais un marteau", alignment: "bontarien" },
      { questName: "Esprit, es-tu la", alignment: "bontarien" },
      { questName: "Vol du Temps", alignment: "bontarien" },
      { questName: "La memoire en lambeaux", alignment: "bontarien" },
      { questName: "Pense-bete", alignment: "bontarien" },
      { questName: "L'eclat de l'aube", alignment: "bontarien" },
      { questName: "Ingerence en amakna", alignment: "bontarien" },
      { questName: "Petites faveurs entre amis", alignment: "bontarien" },
      { questName: "Les gardiens de la galerie", alignment: "bontarien" },
      { questName: "Le plateau de leng", alignment: "bontarien" },
      { questName: "Gele à pierre fendre", alignment: "bontarien" },
      { questName: "L'ascension de qu'tan", alignment: "bontarien" },
      { questName: "Il ne faut pas se fier aux apparences", alignment: "bontarien" },
      { questName: "On se calme", alignment: "bontarien" },
      { questName: "Tout est bien qui finit mal", alignment: "bontarien" },
      { questName: "Ca fait froid dans le dos", alignment: "bontarien" },
      { questName: "Cambriolage a duree determinee", alignment: "bontarien" },
      { questName: "C'est toujours dur le matin", alignment: "bontarien" },
      { questName: "Je panse donc j'essuie", alignment: "bontarien" },
      { questName: "L'aube des morts-vivants", alignment: "bontarien" },
      { questName: "Un chemin tout trace", alignment: "bontarien" },
      { questName: "Enigma", alignment: "bontarien" },
      { questName: "A glacer le sang", alignment: "bontarien" },
      { questName: "A l'ombre des murs", alignment: "bontarien" },
      { questName: "Fee d'hiver", alignment: "bontarien" },
      { questName: "L'exorciste", alignment: "bontarien" },

      // — Brakmar —
      { questName: "Cliquetis fou", alignment: "brakmarien" },
      { questName: "Le professionnel", alignment: "brakmarien" },
      { questName: "Un coup de fouet", alignment: "brakmarien" },
      { questName: "Le dentiste dement", alignment: "brakmarien" },
      { questName: "La revanche de mak", alignment: "brakmarien" },
      { questName: "La noirceur des armes blanches", alignment: "brakmarien" },
      { questName: "La mise à mort", alignment: "brakmarien" },
      { questName: "Les gardes d'honneur... a punir", alignment: "brakmarien" },
      { questName: "Un oubli regrettable", alignment: "brakmarien" },
      { questName: "Tete de gland", alignment: "brakmarien" },
      { questName: "Pauvre larve", alignment: "brakmarien" },
      { questName: "Pauvre larve... doree", alignment: "brakmarien" },
      { questName: "Agent double et demi", alignment: "brakmarien" },
      { questName: "Livreur de mauvaise nouvelle", alignment: "brakmarien" },
      { questName: "Une collection digne de Xilebo", alignment: "brakmarien" },
      { questName: "D'egout pille", alignment: "brakmarien" },
      { questName: "Le tabi mangeur de blops", alignment: "brakmarien" },
      { questName: "Alchimie malfaisante", alignment: "brakmarien" },
      { questName: "Des capes typiques", alignment: "brakmarien" },
      { questName: "Le testament du papa", alignment: "brakmarien" },
      { questName: "Amadouer ou corrompre", alignment: "brakmarien" },
      { questName: "Taxe gratuite", alignment: "brakmarien" },
      { questName: "Par la force ou par la finesse", alignment: "brakmarien" },
      { questName: "Le dur travail d'eplucheur de patates", alignment: "brakmarien" },
      { questName: "Cruel, mais à quel point", alignment: "brakmarien" },
      { questName: "Activites volcaniques", alignment: "brakmarien" },
      { questName: "Chasse a l'espion", alignment: "brakmarien" },
      { questName: "Un petit oubli", alignment: "brakmarien" },
      { questName: "Du venin sinon rien", alignment: "brakmarien" },
      { questName: "Le defi du maitre guerrier", alignment: "brakmarien" },
      { questName: "Joie de courte duree", alignment: "brakmarien" },
      { questName: "Au combat", alignment: "brakmarien" },
      { questName: "Un assassin... a Bonta", alignment: "brakmarien" },
      { questName: "Un dentier pour l'ami mak", alignment: "brakmarien" },
      { questName: "Un choix difficile", alignment: "brakmarien" },
      { questName: "Arrivee a bon port", alignment: "brakmarien" },
      { questName: "Humiliation sans precedent", alignment: "brakmarien" },
      { questName: "Opposition aux opposants", alignment: "brakmarien" },
      { questName: "A la rescousse d'un incapable", alignment: "brakmarien" },
      { questName: "Mulanthropie", alignment: "brakmarien" },
      { questName: "Triple x", alignment: "brakmarien" },
      { questName: "X comme xephires", alignment: "brakmarien" },
      { questName: "Operation commando", alignment: "brakmarien" },
      { questName: "Rencontre du premier type", alignment: "brakmarien" },
      { questName: "Joyau... ze fete", alignment: "brakmarien" },
      { questName: "Le cristal de kain dharyn", alignment: "brakmarien" },
      { questName: "Cambriolage", alignment: "brakmarien" },
      { questName: "Livraison rapide", alignment: "brakmarien" },
      { questName: "Le moment de vérité", alignment: "brakmarien" },
      { questName: "Le puits sans fond", alignment: "brakmarien" },
      { questName: "Le carnage des plaines", alignment: "brakmarien" },
      { questName: "Dans la peau de sphincter cell", alignment: "brakmarien" },
      { questName: "Le forgeron aux deux mains gauches", alignment: "brakmarien" },
      { questName: "Mon nom est poison", alignment: "brakmarien" },
      { questName: "Un maitre es pion", alignment: "brakmarien" },
      { questName: "Le magnanime", alignment: "brakmarien" },
      { questName: "Supermilicien", alignment: "brakmarien" },
      { questName: "Le forgeron", alignment: "brakmarien" },
      { questName: "Paranoia aigue", alignment: "brakmarien" },
      { questName: "A la maniere des Brakmariens", alignment: "brakmarien" },
      { questName: "Le tresor de La descemer", alignment: "brakmarien" },
      { questName: "Une rumeur allechante", alignment: "brakmarien" },
      { questName: "Enquete a moon", alignment: "brakmarien" },
      { questName: "Maniere forte", alignment: "brakmarien" },
      { questName: "Retour aux origines", alignment: "brakmarien" },
      { questName: "Une faille dans sa carapace", alignment: "brakmarien" },
      { questName: "Les documents avant tout", alignment: "brakmarien" },
      { questName: "Les ordres sont-ils les ordres", alignment: "brakmarien" },
      { questName: "Contre-espion", alignment: "brakmarien" },
      { questName: "Histoires de salaces", alignment: "brakmarien" },
      { questName: "Affrontement", alignment: "brakmarien" },
      { questName: "Legitime defense", alignment: "brakmarien" },
      { questName: "L'epee maudite", alignment: "brakmarien" },
      { questName: "Allez, ce fer", alignment: "brakmarien" },
      { questName: "Poignee d'amour", alignment: "brakmarien" },
      { questName: "Le marteau des chus", alignment: "brakmarien" },
      { questName: "L'epee, ca sent mauvais", alignment: "brakmarien" },
      { questName: "Plus, plus de puissance", alignment: "brakmarien" },
      { questName: "Des recherches sur la corne", alignment: "brakmarien" },
      { questName: "Maitre chanteur", alignment: "brakmarien" },
      { questName: "Comploteur malgre lui", alignment: "brakmarien" },
      { questName: "Le roi estitsh", alignment: "brakmarien" },
      { questName: "Le trou d'uk", alignment: "brakmarien" },
      { questName: "Gaspiller l'energie ensemble", alignment: "brakmarien" },
      { questName: "Gemme les joyaux", alignment: "brakmarien" },
      { questName: "L'arakne de leng", alignment: "brakmarien" },
      { questName: "Marque d'une pierre blanche", alignment: "brakmarien" },
      { questName: "L'essor de qu'tan", alignment: "brakmarien" },
      { questName: "L'habit ne fait pas le moine", alignment: "brakmarien" },
      { questName: "Les clefs du malheur", alignment: "brakmarien" },
      { questName: "Chaud devant", alignment: "brakmarien" },
      { questName: "La vengeance est un plat qui se mange froid", alignment: "brakmarien" },
      { questName: "Melodie en sous-sol", alignment: "brakmarien" },
      { questName: "Un monde en pets", alignment: "brakmarien" },
      { questName: "Mieux vaut guerir que mourir", alignment: "brakmarien" },
      { questName: "Le crepuscule des morts-vivants", alignment: "brakmarien" },
      { questName: "Le faux cul", alignment: "brakmarien" },
      { questName: "Cryptomane", alignment: "brakmarien" },
      { questName: "Sueurs froides", alignment: "brakmarien" },
      { questName: "Sur la route d'erazal", alignment: "brakmarien" },
      { questName: "Lettre à ilyz", alignment: "brakmarien" },
      { questName: "La danse macabre", alignment: "brakmarien" },

      // — Ordres Bonta —
      { questName: "Apprentissage : Disciple de menalt", alignment: "bontarien", alignmentOrder: "coeur-vaillant" },
      { questName: "Apprentissage : Ecuyer", alignment: "bontarien", alignmentOrder: "coeur-vaillant" },
      { questName: "Apprentissage : Chevalier de l'espoir", alignment: "bontarien", alignmentOrder: "coeur-vaillant" },
      { questName: "Apprentissage : Champion merveilleux", alignment: "bontarien", alignmentOrder: "coeur-vaillant" },
      { questName: "Apprentissage : Heros legendaire", alignment: "bontarien", alignmentOrder: "coeur-vaillant" },

      { questName: "Apprentissage : Disciple de silvosse", alignment: "bontarien", alignmentOrder: "oeil-attentif" },
      { questName: "Apprentissage : Espion silencieux", alignment: "bontarien", alignmentOrder: "oeil-attentif" },
      { questName: "Apprentissage : Chasseur de renegats", alignment: "bontarien", alignmentOrder: "oeil-attentif" },
      { questName: "Apprentissage : Assassin supreme", alignment: "bontarien", alignmentOrder: "oeil-attentif" },
      { questName: "Apprentissage : Maitre des illusions", alignment: "bontarien", alignmentOrder: "oeil-attentif" },

      { questName: "Apprentissage : Disciple de jiva", alignment: "bontarien", alignmentOrder: "esprit-salvateur" },
      { questName: "Apprentissage : Apprenti eclaire", alignment: "bontarien", alignmentOrder: "esprit-salvateur" },
      { questName: "Apprentissage : Adepte des ecrits", alignment: "bontarien", alignmentOrder: "esprit-salvateur" },
      { questName: "Apprentissage : Maitre des parchemins", alignment: "bontarien", alignmentOrder: "esprit-salvateur" },
      { questName: "Apprentissage : Gardien du savoir", alignment: "bontarien", alignmentOrder: "esprit-salvateur" },

      // — Ordres Brakmar —
      { questName: "Apprentissage : Disciple de djaul", alignment: "brakmarien", alignmentOrder: "coeur-saignant" },
      { questName: "Apprentissage : Surineur", alignment: "brakmarien", alignmentOrder: "coeur-saignant" },
      { questName: "Apprentissage : Chevalier du desespoir", alignment: "brakmarien", alignmentOrder: "coeur-saignant" },
      { questName: "Apprentissage : Champion du chaos", alignment: "brakmarien", alignmentOrder: "coeur-saignant" },
      { questName: "Apprentissage : Heros de l'apocalypse", alignment: "brakmarien", alignmentOrder: "coeur-saignant" },

      { questName: "Apprentissage : Disciple de brumaire", alignment: "brakmarien", alignmentOrder: "oeil-putride" },
      { questName: "Apprentissage : Espion sombre", alignment: "brakmarien", alignmentOrder: "oeil-putride" },
      { questName: "Apprentissage : Chasseur d'ames", alignment: "brakmarien", alignmentOrder: "oeil-putride" },
      { questName: "Apprentissage : Psychopathe", alignment: "brakmarien", alignmentOrder: "oeil-putride" },
      { questName: "Apprentissage : Maitre des ombres", alignment: "brakmarien", alignmentOrder: "oeil-putride" },

      { questName: "Apprentissage : Disciple d'hecate", alignment: "brakmarien", alignmentOrder: "esprit-malsain" },
      { questName: "Apprentissage : Apprenti sombre", alignment: "brakmarien", alignmentOrder: "esprit-malsain" },
      { questName: "Apprentissage : Adepte des Douleurs", alignment: "brakmarien", alignmentOrder: "esprit-malsain" },
      { questName: "Apprentissage : Maitre des sevices", alignment: "brakmarien", alignmentOrder: "esprit-malsain" },
      { questName: "Apprentissage : Gardien des tortures", alignment: "brakmarien", alignmentOrder: "esprit-malsain" },
    ],
  },
];

export const ALIGNMENT_LOOKUP: ReadonlyMap<string, ReadonlyMap<string, AlignmentEntry>> = (() => {
  const outer = new Map<string, Map<string, AlignmentEntry>>();
  for (const entry of RAW_OVERRIDES) {
    const inner = new Map<string, AlignmentEntry>();
    for (const q of entry.quests) {
      inner.set(nameToSlug(q.questName), { alignment: q.alignment, alignmentOrder: q.alignmentOrder });
    }
    outer.set(entry.dofusSlug, inner);
  }
  return outer;
})();

export function getAlignmentOverride(dofusSlug: string, questSlug: string): AlignmentEntry | null {
  return ALIGNMENT_LOOKUP.get(dofusSlug)?.get(questSlug) ?? null;
}

/** Returns all quest slugs that have an alignment override for a given dofus. */
export function getAlignmentOverrideSlugsForDofus(dofusSlug: string): string[] {
  return [...(ALIGNMENT_LOOKUP.get(dofusSlug)?.keys() ?? [])];
}
