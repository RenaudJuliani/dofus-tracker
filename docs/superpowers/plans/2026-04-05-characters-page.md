# Characters Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer `/profile` par une page `/characters` deux colonnes — liste des persos à gauche avec stats globales, détail (grille Dofus + gestion) à droite.

**Architecture:** Server Component charge `characters`, `dofusList`, et toute la progression en une requête (`getAllProgressForUser` sur `v_dofus_progress` filtrée par `user_id`). Client Component gère la sélection locale. Les mutations (créer/renommer/supprimer) appellent Supabase côté client puis `router.refresh()`.

**Tech Stack:** Next.js 14 App Router, Supabase, Zustand, Tailwind, Vitest + React Testing Library

---

## File Map

### Créés
- `apps/web/app/characters/page.tsx` — Server Component, charge les données initiales
- `apps/web/components/characters/CharactersClient.tsx` — Client Component principal, layout deux colonnes
- `apps/web/components/characters/CharacterList.tsx` — Colonne gauche : liste cliquable + stats globales
- `apps/web/components/characters/CharacterDetail.tsx` — Colonne droite : stats, grille Dofus, rename/delete
- `apps/web/components/characters/CharacterForm.tsx` — Formulaire création (extrait de CharacterManager)
- `apps/web/__tests__/CharacterList.test.tsx` — Tests colonne gauche
- `apps/web/__tests__/CharacterDetail.test.tsx` — Tests colonne droite

### Modifiés
- `packages/db/src/queries/dofus.ts` — ajout `getAllProgressForUser`
- `packages/db/src/queries/characters.ts` — ajout `updateCharacter`
- `packages/db/src/index.ts` — exports des nouvelles fonctions
- `apps/web/components/nav/Navbar.tsx` — lien "Profil" → "/characters"
- `apps/web/app/profile/page.tsx` — redirect vers `/characters`

### Supprimés
- `apps/web/components/profile/CharacterManager.tsx` — remplacé par les nouveaux composants
- `apps/web/__tests__/CharacterManager.test.tsx` — remplacé par les nouveaux tests

---

## Task 1 — DB : getAllProgressForUser + updateCharacter

**Files:**
- Modify: `packages/db/src/queries/dofus.ts`
- Modify: `packages/db/src/queries/characters.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Ajouter `getAllProgressForUser` dans `packages/db/src/queries/dofus.ts`**

Ajouter à la fin du fichier :

```ts
export async function getAllProgressForUser(
  client: SupabaseClient,
  userId: string
): Promise<DofusProgress[]> {
  const { data, error } = await client
    .from("v_dofus_progress")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    progress_pct: row.progress_pct != null ? Number(row.progress_pct) : 0,
  })) as DofusProgress[];
}
```

- [ ] **Step 2: Ajouter `updateCharacter` dans `packages/db/src/queries/characters.ts`**

Ajouter à la fin du fichier :

```ts
export async function updateCharacter(
  client: SupabaseClient,
  characterId: string,
  name: string
): Promise<Character> {
  const { data, error } = await client
    .from("characters")
    .update({ name })
    .eq("id", characterId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 3: Exporter les nouvelles fonctions dans `packages/db/src/index.ts`**

```ts
export {
  getDofusList,
  getDofusById,
  getDofusBySlug,
  getDofusProgressForCharacter,
  getAllProgressForUser,
} from "./queries/dofus.js";

export {
  getCharacters,
  createCharacter,
  deleteCharacter,
  updateCharacter,
} from "./queries/characters.js";
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/queries/dofus.ts packages/db/src/queries/characters.ts packages/db/src/index.ts
git commit -m "feat(db): add getAllProgressForUser and updateCharacter"
```

---

## Task 2 — CharacterForm

**Files:**
- Create: `apps/web/components/characters/CharacterForm.tsx`

Formulaire de création de personnage, extrait de `CharacterManager`. Reçoit un callback `onCreated` appelé après succès.

- [ ] **Step 1: Créer `apps/web/components/characters/CharacterForm.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/characters/CharacterForm.tsx
git commit -m "feat(web): add CharacterForm component"
```

---

## Task 3 — CharacterList

**Files:**
- Create: `apps/web/components/characters/CharacterList.tsx`
- Create: `apps/web/__tests__/CharacterList.test.tsx`

Colonne gauche. Reçoit `characters`, `allProgress`, `selectedId`, `onSelect`, `onNewCharacter`.

Calcule pour chaque perso :
- `globalPct` = moyenne de `progress_pct` sur tous ses Dofus
- `completedDofus` = nombre de Dofus avec `progress_pct === 100`
- `totalDofus` = nombre de Dofus distincts dans `allProgress` pour ce perso

- [ ] **Step 1: Écrire le test**

Créer `apps/web/__tests__/CharacterList.test.tsx` :

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Character, DofusProgress } from "@dofus-tracker/types";

const characters: Character[] = [
  { id: "c1", user_id: "u1", name: "Tougli", character_class: "Cra", created_at: "2024-01-01" },
  { id: "c2", user_id: "u1", name: "MonIop", character_class: "Iop", created_at: "2024-01-02" },
];

const allProgress: DofusProgress[] = [
  { character_id: "c1", user_id: "u1", character_name: "Tougli", dofus_id: "d1", dofus_name: "Émeraude", total_quests: 10, completed_quests: 10, progress_pct: 100 },
  { character_id: "c1", user_id: "u1", character_name: "Tougli", dofus_id: "d2", dofus_name: "Ocre", total_quests: 20, completed_quests: 10, progress_pct: 50 },
  { character_id: "c2", user_id: "u1", character_name: "MonIop", dofus_id: "d1", dofus_name: "Émeraude", total_quests: 10, completed_quests: 0, progress_pct: 0 },
];

const { CharacterList } = await import("@/components/characters/CharacterList");

describe("CharacterList", () => {
  it("renders all character names", () => {
    render(<CharacterList characters={characters} allProgress={allProgress} selectedId="c1" onSelect={vi.fn()} onNewCharacter={vi.fn()} />);
    expect(screen.getByText("Tougli")).toBeInTheDocument();
    expect(screen.getByText("MonIop")).toBeInTheDocument();
  });

  it("shows global progress percentage for each character", () => {
    render(<CharacterList characters={characters} allProgress={allProgress} selectedId="c1" onSelect={vi.fn()} onNewCharacter={vi.fn()} />);
    // Tougli: (100 + 50) / 2 = 75%
    expect(screen.getByText("75%")).toBeInTheDocument();
    // MonIop: 0 / 1 = 0%
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("shows completed dofus count", () => {
    render(<CharacterList characters={characters} allProgress={allProgress} selectedId="c1" onSelect={vi.fn()} onNewCharacter={vi.fn()} />);
    // Tougli: 1/2 Dofus à 100%
    expect(screen.getByText("1 / 2 Dofus")).toBeInTheDocument();
  });

  it("calls onSelect when a character row is clicked", () => {
    const onSelect = vi.fn();
    render(<CharacterList characters={characters} allProgress={allProgress} selectedId="c1" onSelect={onSelect} onNewCharacter={vi.fn()} />);
    fireEvent.click(screen.getByText("MonIop"));
    expect(onSelect).toHaveBeenCalledWith("c2");
  });

  it("calls onNewCharacter when the new button is clicked", () => {
    const onNewCharacter = vi.fn();
    render(<CharacterList characters={characters} allProgress={allProgress} selectedId="c1" onSelect={vi.fn()} onNewCharacter={onNewCharacter} />);
    fireEvent.click(screen.getByRole("button", { name: /nouveau personnage/i }));
    expect(onNewCharacter).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

```bash
pnpm --filter @dofus-tracker/web test -- --reporter=verbose CharacterList
```

Expected: FAIL — module not found

- [ ] **Step 3: Créer `apps/web/components/characters/CharacterList.tsx`**

```tsx
import type { Character, DofusProgress } from "@dofus-tracker/types";

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
          return (
            <button
              key={char.id}
              onClick={() => onSelect(char.id)}
              className={`w-full text-left px-4 py-3.5 hover:bg-white/5 transition-colors ${
                isSelected ? "bg-dofus-green/10 border-l-2 border-dofus-green" : ""
              }`}
            >
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
```

- [ ] **Step 4: Lancer le test**

```bash
pnpm --filter @dofus-tracker/web test -- --reporter=verbose CharacterList
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/characters/CharacterList.tsx apps/web/__tests__/CharacterList.test.tsx
git commit -m "feat(web): add CharacterList component"
```

---

## Task 4 — CharacterDetail

**Files:**
- Create: `apps/web/components/characters/CharacterDetail.tsx`
- Create: `apps/web/__tests__/CharacterDetail.test.tsx`

Colonne droite. Reçoit `character`, `dofusList`, `progressForCharacter` (tableau filtré pour ce perso), `userId`, `onRefresh`, `onDeleted`.

- [ ] **Step 1: Écrire le test**

Créer `apps/web/__tests__/CharacterDetail.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Character, Dofus, DofusProgress } from "@dofus-tracker/types";

const mockUpdateCharacter = vi.fn();
const mockDeleteCharacter = vi.fn();

vi.mock("@dofus-tracker/db", () => ({
  updateCharacter: mockUpdateCharacter,
  deleteCharacter: mockDeleteCharacter,
}));

vi.mock("@/app/providers", () => ({
  useSupabase: () => ({}),
}));

const mockSetActiveCharacterId = vi.fn();
vi.mock("@/lib/stores/characterStore", () => ({
  useCharacterStore: (selector: (s: { activeCharacterId: string | null; setActiveCharacterId: (id: string | null) => void }) => unknown) =>
    selector({ activeCharacterId: null, setActiveCharacterId: mockSetActiveCharacterId }),
}));

const character: Character = {
  id: "c1", user_id: "u1", name: "Tougli", character_class: "Cra", created_at: "2024-01-01",
};

const dofusList: Dofus[] = [
  { id: "d1", name: "Dofus Émeraude", slug: "dofus-emeraude", type: "primordial", color: "#4ade80", description: "", recommended_level: 200, image_url: null, created_at: "", updated_at: "" },
];

const progressForCharacter: DofusProgress[] = [
  { character_id: "c1", user_id: "u1", character_name: "Tougli", dofus_id: "d1", dofus_name: "Dofus Émeraude", total_quests: 10, completed_quests: 7, progress_pct: 70 },
];

const { CharacterDetail } = await import("@/components/characters/CharacterDetail");

describe("CharacterDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateCharacter.mockResolvedValue({ ...character, name: "TougliRenommé" });
    mockDeleteCharacter.mockResolvedValue(undefined);
  });

  it("renders character name, class, and global progress", () => {
    render(<CharacterDetail character={character} dofusList={dofusList} progressForCharacter={progressForCharacter} userId="u1" onRefresh={vi.fn()} onDeleted={vi.fn()} />);
    expect(screen.getByText("Tougli")).toBeInTheDocument();
    expect(screen.getByText("Cra")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("renders total quests completed", () => {
    render(<CharacterDetail character={character} dofusList={dofusList} progressForCharacter={progressForCharacter} userId="u1" onRefresh={vi.fn()} onDeleted={vi.fn()} />);
    expect(screen.getByText("7 / 10 quêtes")).toBeInTheDocument();
  });

  it("enters rename mode on 'Renommer' click", async () => {
    render(<CharacterDetail character={character} dofusList={dofusList} progressForCharacter={progressForCharacter} userId="u1" onRefresh={vi.fn()} onDeleted={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /renommer/i }));
    expect(screen.getByDisplayValue("Tougli")).toBeInTheDocument();
  });

  it("calls updateCharacter and onRefresh on rename confirm", async () => {
    const onRefresh = vi.fn();
    render(<CharacterDetail character={character} dofusList={dofusList} progressForCharacter={progressForCharacter} userId="u1" onRefresh={onRefresh} onDeleted={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /renommer/i }));
    const input = screen.getByDisplayValue("Tougli");
    await userEvent.clear(input);
    await userEvent.type(input, "TougliRenommé");
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(mockUpdateCharacter).toHaveBeenCalledWith(expect.any(Object), "c1", "TougliRenommé"));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });

  it("calls deleteCharacter and onDeleted on confirm delete", async () => {
    const onDeleted = vi.fn();
    render(<CharacterDetail character={character} dofusList={dofusList} progressForCharacter={progressForCharacter} userId="u1" onRefresh={vi.fn()} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole("button", { name: /supprimer/i }));
    // Confirmation step
    fireEvent.click(screen.getByRole("button", { name: /confirmer/i }));
    await waitFor(() => expect(mockDeleteCharacter).toHaveBeenCalledWith(expect.any(Object), "c1"));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

```bash
pnpm --filter @dofus-tracker/web test -- --reporter=verbose CharacterDetail
```

Expected: FAIL — module not found

- [ ] **Step 3: Créer `apps/web/components/characters/CharacterDetail.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/app/providers";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { updateCharacter, deleteCharacter } from "@dofus-tracker/db";
import { DofusCard } from "@/components/home/DofusCard";
import type { Character, Dofus, DofusProgress } from "@dofus-tracker/types";

interface Props {
  character: Character;
  dofusList: Dofus[];
  progressForCharacter: DofusProgress[];
  userId: string;
  onRefresh: () => void;
  onDeleted: () => void;
}

export function CharacterDetail({ character, dofusList, progressForCharacter, onRefresh, onDeleted }: Props) {
  const supabase = useSupabase();
  const router = useRouter();
  const setActiveCharacterId = useCharacterStore((s) => s.setActiveCharacterId);

  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(character.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const progressMap = new Map(progressForCharacter.map((p) => [p.dofus_id, p]));
  const globalPct = progressForCharacter.length > 0
    ? Math.round(progressForCharacter.reduce((s, p) => s + p.progress_pct, 0) / progressForCharacter.length)
    : 0;
  const totalCompleted = progressForCharacter.reduce((s, p) => s + p.completed_quests, 0);
  const totalQuests = progressForCharacter.reduce((s, p) => s + p.total_quests, 0);

  const primordial = dofusList.filter((d) => d.type === "primordial");
  const secondaire = dofusList.filter((d) => d.type === "secondaire");

  async function handleRenameConfirm() {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === character.name) { setRenaming(false); return; }
    await updateCharacter(supabase, character.id, trimmed);
    setRenaming(false);
    onRefresh();
  }

  async function handleDelete() {
    await deleteCharacter(supabase, character.id);
    onDeleted();
  }

  function handleDofusCardClick() {
    setActiveCharacterId(character.id);
  }

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
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
```

- [ ] **Step 4: Lancer le test**

```bash
pnpm --filter @dofus-tracker/web test -- --reporter=verbose CharacterDetail
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/characters/CharacterDetail.tsx apps/web/__tests__/CharacterDetail.test.tsx
git commit -m "feat(web): add CharacterDetail component"
```

---

## Task 5 — CharactersClient

**Files:**
- Create: `apps/web/components/characters/CharactersClient.tsx`

Layout deux colonnes. Gère `selectedId` local (`useState`). Sur mobile : une seule colonne avec un sélecteur en haut. Si aucun perso existant → affiche `CharacterForm` directement.

- [ ] **Step 1: Créer `apps/web/components/characters/CharactersClient.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/characters/CharactersClient.tsx
git commit -m "feat(web): add CharactersClient layout component"
```

---

## Task 6 — app/characters/page.tsx

**Files:**
- Create: `apps/web/app/characters/page.tsx`

- [ ] **Step 1: Créer `apps/web/app/characters/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { getDofusList, getCharacters, getAllProgressForUser } from "@dofus-tracker/db";
import { CharactersClient } from "@/components/characters/CharactersClient";
import { redirect } from "next/navigation";

export default async function CharactersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [characters, dofusList, allProgress] = await Promise.all([
    getCharacters(supabase, user.id),
    getDofusList(supabase),
    getAllProgressForUser(supabase, user.id),
  ]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">
          Mes <span className="text-dofus-green">Personnages</span>
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          {characters.length} personnage{characters.length !== 1 ? "s" : ""}
        </p>
      </header>

      <CharactersClient
        characters={characters}
        dofusList={dofusList}
        allProgress={allProgress}
        userId={user.id}
      />
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/characters/page.tsx
git commit -m "feat(web): add /characters server page"
```

---

## Task 7 — Routing + cleanup

**Files:**
- Modify: `apps/web/app/profile/page.tsx`
- Modify: `apps/web/components/nav/Navbar.tsx`
- Delete: `apps/web/components/profile/CharacterManager.tsx`
- Delete: `apps/web/__tests__/CharacterManager.test.tsx`

- [ ] **Step 1: Remplacer `apps/web/app/profile/page.tsx` par un redirect**

```tsx
import { redirect } from "next/navigation";

export default function ProfilePage() {
  redirect("/characters");
}
```

- [ ] **Step 2: Mettre à jour le lien dans `apps/web/components/nav/Navbar.tsx`**

Remplacer :

```tsx
<Link href="/profile" className="text-sm text-gray-400 hover:text-white transition-colors">
  Profil
</Link>
```

par :

```tsx
<Link href="/characters" className="text-sm text-gray-400 hover:text-white transition-colors">
  Personnages
</Link>
```

- [ ] **Step 3: Supprimer les fichiers obsolètes**

```bash
rm apps/web/components/profile/CharacterManager.tsx
rm apps/web/__tests__/CharacterManager.test.tsx
```

- [ ] **Step 4: Lancer tous les tests pour s'assurer que rien n'est cassé**

```bash
pnpm --filter @dofus-tracker/web test
```

Expected: tous les tests passent (les deux nouveaux + les existants)

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/profile/page.tsx apps/web/components/nav/Navbar.tsx
git rm apps/web/components/profile/CharacterManager.tsx apps/web/__tests__/CharacterManager.test.tsx
git commit -m "feat(web): replace /profile with /characters redirect, update navbar, remove CharacterManager"
```
