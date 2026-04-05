"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { CharacterList } from "./CharacterList";
import { CharacterDetail } from "./CharacterDetail";
import { CharacterForm } from "./CharacterForm";
import type { Character, Dofus, DofusProgress } from "@dofus-tracker/types";

interface Props {
  characters: Character[];
  dofusList: Dofus[];
  allProgress: DofusProgress[];
  userId: string;
}

export function CharactersClient({ characters: initial, dofusList, allProgress: initialProgress, userId }: Props) {
  const router = useRouter();
  const setActiveCharacterId = useCharacterStore((s) => s.setActiveCharacterId);

  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  // showForm = true when "Nouveau personnage" is clicked or no characters exist
  const [showForm, setShowForm] = useState(initial.length === 0);

  const selectedCharacter = initial.find((c) => c.id === selectedId) ?? null;
  const progressForSelected = initialProgress.filter((p) => p.character_id === selectedId);

  function handleNewCharacter() {
    setSelectedId(null);
    setShowForm(true);
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    setShowForm(false);
  }

  function handleCreated(character: Character) {
    if (initial.length === 0) setActiveCharacterId(character.id);
    setSelectedId(character.id);
    setShowForm(false);
    router.refresh();
  }

  function handleDeleted() {
    setSelectedId(null);
    setShowForm(true);
    router.refresh();
  }

  function handleRefresh() {
    router.refresh();
  }

  return (
    <div>
      {/* Mobile: character selector dropdown */}
      {initial.length > 0 && (
        <div className="md:hidden mb-4">
          <select
            value={selectedId ?? ""}
            onChange={(e) => {
              if (e.target.value === "__new__") { handleNewCharacter(); }
              else { handleSelect(e.target.value); }
            }}
            className="input w-full"
          >
            {initial.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.character_class}</option>
            ))}
            <option value="__new__">+ Nouveau personnage</option>
          </select>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column — desktop only */}
        <div className="hidden md:block w-72 shrink-0 glass rounded-2xl overflow-hidden">
          {initial.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">Aucun personnage</p>
          ) : (
            <CharacterList
              characters={initial}
              allProgress={initialProgress}
              selectedId={selectedId}
              onSelect={handleSelect}
              onNewCharacter={handleNewCharacter}
            />
          )}
        </div>

        {/* Right column */}
        <div className="flex-1 min-w-0">
          {showForm || !selectedCharacter ? (
            <CharacterForm userId={userId} onCreated={handleCreated} />
          ) : (
            <CharacterDetail
              character={selectedCharacter}
              dofusList={dofusList}
              progressForCharacter={progressForSelected}
              userId={userId}
              onRefresh={handleRefresh}
              onDeleted={handleDeleted}
            />
          )}
        </div>
      </div>
    </div>
  );
}
