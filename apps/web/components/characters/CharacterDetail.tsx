"use client";

import { useState } from "react";
import Image from "next/image";
import { useSupabase } from "@/app/providers";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { updateCharacter, deleteCharacter } from "@dofus-tracker/db";
import { DofusCard } from "@/components/home/DofusCard";
import { classImageUrl } from "@/lib/classImageUrl";
import type { Character, Dofus, DofusProgress } from "@dofus-tracker/types";

interface Props {
  character: Character;
  dofusList: Dofus[];
  progressForCharacter: DofusProgress[];
  userId: string;
  onRefresh: () => void;
  onDeleted: () => void;
}

export function CharacterDetail({ character, dofusList, progressForCharacter, userId, onRefresh, onDeleted }: Props) {
  const supabase = useSupabase();
  const setActiveCharacterId = useCharacterStore((s) => s.setActiveCharacterId);

  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(character.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const progressMap = new Map(progressForCharacter.map((p) => [p.dofus_id, p]));
  const globalPct = progressForCharacter.length > 0
    ? Math.min(100, Math.round(progressForCharacter.reduce((s, p) => s + p.progress_pct, 0) / progressForCharacter.length))
    : 0;
  const totalCompleted = progressForCharacter.reduce((s, p) => s + p.completed_quests, 0);
  const totalQuests = progressForCharacter.reduce((s, p) => s + p.total_quests, 0);

  const primordial = dofusList.filter((d) => d.type === "primordial");
  const secondaire = dofusList.filter((d) => d.type === "secondaire");

  async function handleRenameConfirm() {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === character.name) { setRenaming(false); return; }
    await updateCharacter(supabase, character.id, userId, trimmed);
    setRenaming(false);
    onRefresh();
  }

  async function handleDelete() {
    await deleteCharacter(supabase, character.id, userId);
    onDeleted();
  }

  function handleDofusCardClick() {
    setActiveCharacterId(character.id);
  }

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="glass rounded-2xl p-5 overflow-hidden relative">
        {classImageUrl(character.character_class, character.gender) && (
          <div className="absolute right-0 top-0 h-full w-32 pointer-events-none">
            <Image
              src={classImageUrl(character.character_class, character.gender)!}
              alt=""
              fill
              className="object-cover object-top opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
          </div>
        )}
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            {renaming ? (
              <input
                className="input text-xl font-extrabold bg-transparent border-b border-dofus-green outline-none text-white w-full"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRenameConfirm(); if (e.key === "Escape") setRenaming(false); }}
                onBlur={handleRenameConfirm}
                autoFocus
              />
            ) : (
              <h2 className="text-2xl font-extrabold text-white">{character.name}</h2>
            )}
            <p className="text-gray-400 text-sm mt-0.5">{character.character_class}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-extrabold text-dofus-green">{globalPct}%</p>
            <p className="text-xs text-gray-400">{totalCompleted} / {totalQuests} quêtes</p>
          </div>
        </div>
      </div>

      {/* Dofus grid */}
      {[{ label: "Primordiaux", list: primordial }, { label: "Secondaires", list: secondaire }].map(({ label, list }) =>
        list.length > 0 ? (
          <section key={label}>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-dofus-green inline-block" />
              {label}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {list.map((dofus) => (
                <div key={dofus.id} onClick={handleDofusCardClick}>
                  <DofusCard dofus={dofus} progress={progressMap.get(dofus.id) ?? null} />
                </div>
              ))}
            </div>
          </section>
        ) : null
      )}

      {/* Manage */}
      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        {!renaming && (
          <button
            onClick={() => { setRenaming(true); setNewName(character.name); }}
            className="btn-secondary text-sm px-3 py-1.5"
          >
            Renommer
          </button>
        )}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-red-400 hover:text-red-300 transition-colors px-3 py-1.5"
          >
            Supprimer
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Confirmer la suppression ?</span>
            <button
              onClick={handleDelete}
              className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1"
            >
              Confirmer
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-gray-400 hover:text-white px-2 py-1"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
