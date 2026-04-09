"use client";

import { useState } from "react";
import Image from "next/image";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { classImageUrl } from "@/lib/classImageUrl";
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
        className="flex items-center gap-2 btn-secondary text-sm px-3 py-1.5 overflow-hidden"
        aria-label={active?.name ?? "Sélectionner un personnage"}
      >
        {active && classImageUrl(active.character_class, active.gender) && (
          <div className="relative w-5 h-5 rounded-full overflow-hidden border border-white/20 shrink-0">
            <Image
              src={classImageUrl(active.character_class, active.gender)!}
              alt={active.character_class}
              fill
              className="object-cover object-top"
            />
          </div>
        )}
        <span>{active?.name ?? "Choisir"}</span>
        <span className="text-gray-400 text-xs">{active?.character_class}</span>
        <span className="text-gray-500 ml-1">▾</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 glass rounded-xl overflow-hidden z-50 min-w-[180px]">
          {characters.map((char) => {
            const imgUrl = classImageUrl(char.character_class, char.gender);
            const isActive = char.id === active?.id;
            return (
              <button
                key={char.id}
                onClick={() => {
                  setActiveCharacterId(char.id);
                  setOpen(false);
                }}
                className={`relative w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center justify-between gap-3 overflow-hidden ${
                  isActive ? "text-dofus-green" : "text-white"
                }`}
              >
                {imgUrl && (
                  <div className="absolute right-0 top-0 h-full w-16 pointer-events-none">
                    <Image
                      src={imgUrl}
                      alt=""
                      fill
                      className="object-cover object-top opacity-20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                  </div>
                )}
                <span className="relative z-10">{char.name}</span>
                <span className="relative z-10 text-xs text-gray-400">{char.character_class}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
