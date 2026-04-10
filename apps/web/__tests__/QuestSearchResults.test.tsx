import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { QuestSearchResult } from "@dofus-tracker/types";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const mockResults: QuestSearchResult[] = [
  {
    quest_id: "q1",
    quest_name: "La Bénédiction de Viti",
    quest_slug: "la-benediction-de-viti",
    sub_section: "Les quêtes",
    dofus_id: "d1",
    dofus_name: "Dofus Turquoise",
    dofus_slug: "dofus-turquoise",
    dofus_color: "#22d3ee",
    dofus_image_url: null,
  },
  {
    quest_id: "q1",
    quest_name: "La Bénédiction de Viti",
    quest_slug: "la-benediction-de-viti",
    sub_section: "Les quêtes",
    dofus_id: "d2",
    dofus_name: "Dofus Ivoire",
    dofus_slug: "dofus-ivoire",
    dofus_color: "#f5f5f4",
    dofus_image_url: null,
  },
];

const { QuestSearchResults } = await import("@/components/home/QuestSearchResults");

describe("QuestSearchResults", () => {
  it("renders one link per result", () => {
    render(<QuestSearchResults results={mockResults} query="béné" loading={false} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/dofus/dofus-turquoise?highlight=la-benediction-de-viti");
    expect(links[1]).toHaveAttribute("href", "/dofus/dofus-ivoire?highlight=la-benediction-de-viti");
  });

  it("shows dofus name for each result", () => {
    render(<QuestSearchResults results={mockResults} query="béné" loading={false} />);
    expect(screen.getByText(/Dofus Turquoise/)).toBeTruthy();
    expect(screen.getByText(/Dofus Ivoire/)).toBeTruthy();
  });

  it("shows loading state", () => {
    render(<QuestSearchResults results={[]} query="béné" loading={true} />);
    expect(screen.getByText(/recherche/i)).toBeTruthy();
  });

  it("shows empty state when no results", () => {
    render(<QuestSearchResults results={[]} query="zzz" loading={false} />);
    expect(screen.getByText(/aucune quête/i)).toBeTruthy();
  });
});
