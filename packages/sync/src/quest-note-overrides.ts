// Static notes attached to specific quest chains.
// For a solo quest: the note appears below the quest name in the UI.
// For the first quest of a group: the note becomes the group box header.

const OVERRIDES: Record<string, Record<string, string>> = {
  "dofus-tachete": {
    "main-dans-la-main":
      "Allez jusqu'à l'étape où vous devez parler au Grandapon et ensuite lancer la quête \"Deux souffles, une inspiration\" qui bloque la suite de la quête. Lancez aussi la quête \"L'épopée du moine pèlerin\" qui elle aussi vous bloquera une étape. Puis finir la quête \"Main dans la main\" après avoir terminé ces deux dernières.",
  },
  "dofus-turquoise": {
    "la-mechante-sorciere-de-l-est":
      "Commencer la quête \"La méchante sorcière de l'est\" jusqu'à rencontrer le Disciple de Viti puis faire la quête \"La bénédiction de viti\" et une fois terminée, revenir et finir la quête \"La méchante sorcière de l'est\".",
    "autel-du-nord":
      "Commencer la quête \"Autel du nord\" jusqu'à rencontrer le Disciple de Viti puis faire la quête \"La bénédiction de thomahon\" et une fois terminée, revenir et finir la quête \"Autel du nord\".",
    "il-etait-une-foi-dans-l-ouest":
      "Commencer la quête \"Il était une fois dans l'ouest\" jusqu'à rencontrer le Disciple de Foluk puis faire la quête \"La bénédiction de Foluk\" et une fois terminée, revenir et finir la quête \"Il était une fois dans l'ouest\".",
  },
  "dofus-vulbis": {
    // First quest of the vulbis-optional group — displayed as the group header
    "l-eternelle-moisson":
      "Réalisez ces quêtes ou alors donnez 1M de kamas au PNJ dans les tombes pour esquiver l'étape de l'Ocre.",
  },
};

export function getNoteOverride(dofusSlug: string, questSlug: string): string | null {
  return OVERRIDES[dofusSlug]?.[questSlug] ?? null;
}
