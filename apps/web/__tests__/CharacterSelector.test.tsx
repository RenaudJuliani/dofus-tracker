import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Character } from "@dofus-tracker/types";

const mockSetActiveCharacterId = vi.fn();
let mockActiveId: string | null = null;

vi.mock("@/lib/stores/characterStore", () => ({
  useCharacterStore: (selector: (s: { activeCharacterId: string | null; setActiveCharacterId: (id: string | null) => void }) => unknown) =>
    selector({
      activeCharacterId: mockActiveId,
      setActiveCharacterId: mockSetActiveCharacterId,
    }),
}));

const characters: Character[] = [
  { id: "c1", user_id: "u1", name: "Tougli", character_class: "Cra", created_at: "2024-01-01" },
  { id: "c2", user_id: "u1", name: "MonIop", character_class: "Iop", created_at: "2024-01-02" },
];

const { CharacterSelector } = await import("@/components/nav/CharacterSelector");

describe("CharacterSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveId = "c1";
  });

  it("renders the active character name", () => {
    render(<CharacterSelector characters={characters} />);
    expect(screen.getByText("Tougli")).toBeInTheDocument();
  });

  it("opens dropdown on click and shows all characters", () => {
    render(<CharacterSelector characters={characters} />);
    fireEvent.click(screen.getByRole("button", { name: /Tougli/i }));
    expect(screen.getByText("MonIop")).toBeInTheDocument();
    expect(screen.getByText("Iop")).toBeInTheDocument();
  });

  it("calls setActiveCharacterId when another character is selected", () => {
    render(<CharacterSelector characters={characters} />);
    fireEvent.click(screen.getByRole("button", { name: /Tougli/i }));
    fireEvent.click(screen.getByText("MonIop"));
    expect(mockSetActiveCharacterId).toHaveBeenCalledWith("c2");
  });

  it("shows 'Aucun personnage' when list is empty", () => {
    render(<CharacterSelector characters={[]} />);
    expect(screen.getByText("Aucun personnage")).toBeInTheDocument();
  });
});
