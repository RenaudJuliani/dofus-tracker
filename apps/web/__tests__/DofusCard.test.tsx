import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Dofus, DofusProgress } from "@dofus-tracker/types";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const dofus: Dofus = {
  id: "d1",
  name: "Dofus Émeraude",
  slug: "emeraude",
  type: "primordial",
  color: "#22c55e",
  description: "Le plus précieux.",
  recommended_level: 200,
  image_url: null,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

const progress: DofusProgress = {
  character_id: "c1",
  user_id: "u1",
  character_name: "Tougli",
  dofus_id: "d1",
  dofus_name: "Dofus Émeraude",
  total_quests: 50,
  completed_quests: 25,
  progress_pct: 50,
};

const { DofusCard } = await import("@/components/home/DofusCard");

describe("DofusCard", () => {
  it("renders the dofus name", () => {
    render(<DofusCard dofus={dofus} progress={progress} />);
    expect(screen.getByText("Dofus Émeraude")).toBeInTheDocument();
  });

  it("renders progress percentage", () => {
    render(<DofusCard dofus={dofus} progress={progress} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders quest counts", () => {
    render(<DofusCard dofus={dofus} progress={progress} />);
    expect(screen.getByText("25 / 50 quêtes")).toBeInTheDocument();
  });

  it("renders 0% when no progress provided", () => {
    render(<DofusCard dofus={dofus} progress={null} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("links to the dofus detail page", () => {
    render(<DofusCard dofus={dofus} progress={progress} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/dofus/emeraude");
  });
});
