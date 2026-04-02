import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Character } from "@dofus-tracker/types";

const mockCreateCharacter = vi.fn();
const mockDeleteCharacter = vi.fn();

vi.mock("@dofus-tracker/db", () => ({
  createCharacter: mockCreateCharacter,
  deleteCharacter: mockDeleteCharacter,
}));

const mockSetActiveCharacterId = vi.fn();
vi.mock("@/lib/stores/characterStore", () => ({
  useCharacterStore: (selector: (s: { activeCharacterId: string | null; setActiveCharacterId: (id: string | null) => void }) => unknown) =>
    selector({ activeCharacterId: "c1", setActiveCharacterId: mockSetActiveCharacterId }),
}));

vi.mock("@/app/providers", () => ({
  useSupabase: () => ({}),
}));

const initialCharacters: Character[] = [
  { id: "c1", user_id: "u1", name: "Tougli", character_class: "Cra", created_at: "2024-01-01" },
];

const { CharacterManager } = await import("@/components/profile/CharacterManager");

describe("CharacterManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCharacter.mockResolvedValue({
      id: "c2", user_id: "u1", name: "MonIop", character_class: "Iop", created_at: "2024-01-02",
    });
    mockDeleteCharacter.mockResolvedValue(undefined);
  });

  it("renders existing characters", () => {
    render(<CharacterManager characters={initialCharacters} userId="u1" />);
    expect(screen.getByText("Tougli")).toBeInTheDocument();
    expect(screen.getByText("Cra")).toBeInTheDocument();
  });

  it("adds a new character on form submit", async () => {
    render(<CharacterManager characters={initialCharacters} userId="u1" />);
    await userEvent.type(screen.getByPlaceholderText("Nom du personnage"), "MonIop");
    await userEvent.type(screen.getByPlaceholderText("Classe (ex: Cra, Iop)"), "Iop");
    fireEvent.click(screen.getByRole("button", { name: /Ajouter/i }));
    await waitFor(() =>
      expect(mockCreateCharacter).toHaveBeenCalledWith(
        expect.any(Object),
        "u1",
        "MonIop",
        "Iop"
      )
    );
  });

  it("deletes a character on delete button click", async () => {
    render(<CharacterManager characters={initialCharacters} userId="u1" />);
    fireEvent.click(screen.getByRole("button", { name: /supprimer/i }));
    await waitFor(() =>
      expect(mockDeleteCharacter).toHaveBeenCalledWith(expect.any(Object), "c1")
    );
  });
});
