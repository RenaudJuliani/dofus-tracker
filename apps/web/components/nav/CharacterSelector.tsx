"use client";

import { useState } from "react";
import { useCharacterStore } from "@/lib/stores/characterStore";
import type { Character } from "@dofus-tracker/types";

interface Props {
  characters: Character[];
}

export function CharacterSelector({ characters }: Props) {
  const [open, setOpen] = useState(false);
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const setActiveCharacterId = useCharacterStore((s) => s.setActiveCharacterId);

  const active = characters.find((c) => c.id === activeCharacterId) ?? characters[0] ?? null;

  if (characters.length === 0) {
    return <span className="text-sm text-gray-400">Aucun personnage</span>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 btn-secondary text-sm px-3 py-1.5"
        aria-label={active?.name ?? "Sélectionner un personnage"}
      >
        <span className="text-dofus-green">⚔</span>
        <span>{active?.name ?? "Choisir"}</span>
        <span className="text-gray-400 text-xs">{active?.character_class}</span>
        <span className="text-gray-500 ml-1">▾</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 glass rounded-xl overflow-hidden z-50 min-w-[160px]">
          {characters.map((char) => (
            <button
              key={char.id}
              onClick={() => {
                setActiveCharacterId(char.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center justify-between gap-3 ${
                char.id === active?.id ? "text-dofus-green" : "text-white"
              }`}
            >
              <span>{char.name}</span>
              <span className="text-xs text-gray-400">{char.character_class}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
