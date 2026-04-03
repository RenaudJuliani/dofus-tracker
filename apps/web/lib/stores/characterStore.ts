import { createCharacterStore } from "@dofus-tracker/ui";
import { createJSONStorage, type PersistStorage } from "zustand/middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storage = createJSONStorage(() => localStorage) as PersistStorage<any>;

export const useCharacterStore = createCharacterStore(storage);
