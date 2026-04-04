export { createSupabaseClient } from "./client.js";
export type { SupabaseClient } from "./client.js";

export {
  getDofusList,
  getDofusById,
  getDofusBySlug,
  getDofusProgressForCharacter,
} from "./queries/dofus.js";

export {
  getCharacters,
  createCharacter,
  deleteCharacter,
} from "./queries/characters.js";

export {
  getQuestsForDofus,
  toggleQuestCompletion,
  bulkCompleteSection,
} from "./queries/quests.js";
