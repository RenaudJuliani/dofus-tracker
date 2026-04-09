"use client";

import { useState } from "react";
import Image from "next/image";
import { useSupabase } from "@/app/providers";
import { createCharacter } from "@dofus-tracker/db";
import type { Character } from "@dofus-tracker/types";
import { classImageUrl } from "@/lib/classImageUrl";

const CLASSES = [
  "Cra", "Ecaflip", "Eniripsa", "Enutrof", "Feca",
  "Iop", "Osamodas", "Pandawa", "Roublard",
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
  const [gender, setGender] = useState<"m" | "f">("m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validClass = CLASSES.find((c) => c.toLowerCase() === characterClass.trim().toLowerCase());
  const preview = validClass ? classImageUrl(validClass, gender) : null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !characterClass.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const newChar = await createCharacter(supabase, userId, name.trim(), characterClass.trim(), gender);
      setName("");
      setCharacterClass("");
      setGender("m");
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

        {/* Genre + aperçu */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            <button
              type="button"
              onClick={() => setGender("m")}
              className={`px-4 py-1.5 text-sm transition-colors ${gender === "m" ? "bg-dofus-green/20 text-dofus-green font-semibold" : "text-gray-400 hover:text-white"}`}
            >
              Homme
            </button>
            <button
              type="button"
              onClick={() => setGender("f")}
              className={`px-4 py-1.5 text-sm transition-colors ${gender === "f" ? "bg-dofus-green/20 text-dofus-green font-semibold" : "text-gray-400 hover:text-white"}`}
            >
              Femme
            </button>
          </div>
          {preview && (
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-white/5">
              <Image src={preview} alt={characterClass} fill className="object-cover object-top" />
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "..." : "Ajouter"}
        </button>
      </form>
    </div>
  );
}
