import { createCharacterStore } from "@dofus-tracker/ui";
import { createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useCharacterStore = createCharacterStore(
  createJSONStorage(() => AsyncStorage)!
);
