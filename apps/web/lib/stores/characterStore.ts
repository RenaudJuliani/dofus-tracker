import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CharacterStore {
  activeCharacterId: string | null;
  setActiveCharacterId: (id: string | null) => void;
}

export const useCharacterStore = create<CharacterStore>()(
  persist(
    (set) => ({
      activeCharacterId: null,
      setActiveCharacterId: (id) => set({ activeCharacterId: id }),
    }),
    { name: "dofus-tracker-character" }
  )
);
