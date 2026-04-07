export { createSupabaseClient } from "./client.js";
export type { SupabaseClient } from "./client.js";

export {
  getDofusList,
  getDofusById,
  getDofusBySlug,
  getDofusProgressForCharacter,
  getAllProgressForUser,
} from "./queries/dofus.js";

export {
  getCharacters,
  createCharacter,
  deleteCharacter,
  updateCharacter,
} from "./queries/characters.js";

export {
  getQuestsForDofus,
  toggleQuestCompletion,
  bulkCompleteSection,
  bulkUncompleteSection,
  getAggregatedResourcesForDofus,
} from "./queries/quests.js";
