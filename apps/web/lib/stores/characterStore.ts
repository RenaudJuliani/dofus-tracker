import { createCharacterStore } from "@dofus-tracker/ui";
import { createJSONStorage } from "zustand/middleware";

export const useCharacterStore = createCharacterStore(
  createJSONStorage(() => localStorage)
);
