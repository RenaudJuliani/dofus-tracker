"use client";

import { useState } from "react";
import { useSupabase } from "@/app/providers";
import { createCharacter } from "@dofus-tracker/db";
import type { Character } from "@dofus-tracker/types";

const CLASSES = [
  "Cra", "Ecaflip", "Eniripsa", "Enutrof", "Feca",
  "Iop", "Masqueraider", "Osamodas", "Pandawa", "Roublard",
  "Sacrieur", "Sadida", "Sram", "Steamer", "Xelor", "Zobal",
  "Eliotrope", "Huppermage", "Ouginak", "Forgelance",
];

interface Props {
  userId: string;
  onCreated: (character: Character) => void;
}

export function CharacterForm({ userId, onCreated }: Props) {
  const supabase = useSupabase();
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
      setName("");
      setCharacterClass("");
      onCreated(newChar);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="font-bold text-white mb-4">Nouveau personnage</h2>
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
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "..." : "Ajouter"}
        </button>
      </form>
    </div>
  );
}
