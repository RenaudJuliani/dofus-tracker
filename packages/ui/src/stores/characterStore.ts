import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";

interface CharacterStore {
  activeCharacterId: string | null;
  setActiveCharacterId: (id: string | null) => void;
}

export function createCharacterStore(storage: PersistStorage<CharacterStore>) {
  return create<CharacterStore>()(
    persist(
      (set) => ({
        activeCharacterId: null,
        setActiveCharacterId: (id) => set({ activeCharacterId: id }),
      }),
      { name: "dofus-tracker-character", storage }
    )
  );
}
