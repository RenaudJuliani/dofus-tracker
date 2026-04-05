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
