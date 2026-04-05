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
vi.mock("@/components/home/DofusCard", () => ({
  DofusCard: ({ dofus }: { dofus: { name: string } }) => <div>{dofus.name}</div>,
}));

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
