import Image from "next/image";
import type { Character, DofusProgress } from "@dofus-tracker/types";
import { classImageUrl } from "@/lib/classImageUrl";

interface Props {
  characters: Character[];
  allProgress: DofusProgress[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewCharacter: () => void;
}

function getCharacterStats(characterId: string, allProgress: DofusProgress[]) {
  const rows = allProgress.filter((p) => p.character_id === characterId);
  if (rows.length === 0) return { globalPct: 0, completedDofus: 0, totalDofus: 0 };
  const globalPct = Math.round(rows.reduce((sum, r) => sum + r.progress_pct, 0) / rows.length);
  const completedDofus = rows.filter((r) => r.progress_pct === 100).length;
  return { globalPct, completedDofus, totalDofus: rows.length };
}

export function CharacterList({ characters, allProgress, selectedId, onSelect, onNewCharacter }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
        {characters.map((char) => {
          const { globalPct, completedDofus, totalDofus } = getCharacterStats(char.id, allProgress);
          const isSelected = char.id === selectedId;
          const imgUrl = classImageUrl(char.character_class, char.gender);
          return (
            <button
              key={char.id}
              onClick={() => onSelect(char.id)}
              className={`relative w-full text-left px-4 py-3.5 hover:bg-white/5 transition-colors overflow-hidden ${
                isSelected ? "bg-dofus-green/10 border-l-2 border-dofus-green" : ""
              }`}
            >
              {/* Watermark */}
              {imgUrl && (
                <div className="absolute right-0 top-0 h-full w-20 pointer-events-none">
                  <Image
                    src={imgUrl}
                    alt=""
                    fill
                    className={`object-cover object-top transition-opacity ${isSelected ? "opacity-25" : "opacity-15"}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
                </div>
              )}

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-white text-sm">{char.name}</span>
                  <span className="text-xs font-bold" style={{ color: isSelected ? "#4ade80" : "#9ca3af" }}>
                    {globalPct}%
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">{char.character_class}</p>
                <div className="w-full bg-white/10 rounded-full h-1 mb-1">
                  <div
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: `${globalPct}%`,
                      background: isSelected
                        ? "linear-gradient(90deg, #4ade8088, #4ade80)"
                        : "linear-gradient(90deg, #6b7280aa, #9ca3af)",
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500">{completedDofus} / {totalDofus} Dofus</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={onNewCharacter}
          aria-label="nouveau personnage"
          className="w-full btn-secondary text-sm py-2"
        >
          + Nouveau personnage
        </button>
      </div>
    </div>
  );
}
