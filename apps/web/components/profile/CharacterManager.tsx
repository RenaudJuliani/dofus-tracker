"use client";

import { useState } from "react";
import { useSupabase } from "@/app/providers";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { createCharacter, deleteCharacter } from "@dofus-tracker/db";
import type { Character } from "@dofus-tracker/types";

const CLASSES = [
  "Cra", "Ecaflip", "Eniripsa", "Enutrof", "Feca",
  "Iop", "Masqueraider", "Osamodas", "Pandawa", "Roublard",
  "Sacrieur", "Sadida", "Sram", "Steamer", "Xelor", "Zobal",
  "Eliotrope", "Huppermage", "Ouginak", "Forgelance",
];

interface Props {
  characters: Character[];
  userId: string;
}

export function CharacterManager({ characters: initial, userId }: Props) {
  const supabase = useSupabase();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const setActiveCharacterId = useCharacterStore((s) => s.setActiveCharacterId);

  const [characters, setCharacters] = useState(initial);
  const [name, setName] = useState("");
  const [characterClass, setCharacterClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !characterClass.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const newChar = await createCharacter(supabase, userId, name.trim(), characterClass.trim());
      setCharacters((prev) => [...prev, newChar]);
      if (characters.length === 0) setActiveCharacterId(newChar.id);
      setName("");
      setCharacterClass("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(charId: string) {
    try {
      await deleteCharacter(supabase, charId);
      setCharacters((prev) => prev.filter((c) => c.id !== charId));
      if (activeCharacterId === charId) {
        const remaining = characters.filter((c) => c.id !== charId);
        setActiveCharacterId(remaining[0]?.id ?? null);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Existing characters */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5">
          <h2 className="font-bold text-white">Mes personnages</h2>
        </div>
        {characters.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">
            Aucun personnage — crée-en un ci-dessous.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {characters.map((char) => (
              <div
                key={char.id}
                className={`flex items-center justify-between px-5 py-3 ${
                  char.id === activeCharacterId ? "bg-dofus-green/5" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {char.id === activeCharacterId && (
                    <span className="w-1.5 h-1.5 rounded-full bg-dofus-green shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">{char.name}</p>
                    <p className="text-xs text-gray-400">{char.character_class}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {char.id !== activeCharacterId && (
                    <button
                      onClick={() => setActiveCharacterId(char.id)}
                      className="text-xs btn-secondary px-2.5 py-1"
                    >
                      Activer
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(char.id)}
                    aria-label="supprimer"
                    className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add character form */}
      <div className="glass rounded-2xl p-5">
        <h2 className="font-bold text-white mb-4">Ajouter un personnage</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du personnage"
            required
            className="input"
          />
          <input
            type="text"
            value={characterClass}
            onChange={(e) => setCharacterClass(e.target.value)}
            placeholder="Classe (ex: Cra, Iop)"
            list="classes-list"
            required
            className="input"
          />
          <datalist id="classes-list">
            {CLASSES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "..." : "Ajouter"}
          </button>
        </form>
      </div>
    </div>
  );
}
