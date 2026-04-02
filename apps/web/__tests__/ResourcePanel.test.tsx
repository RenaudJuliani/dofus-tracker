import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Resource } from "@dofus-tracker/types";

const resources: Resource[] = [
  { id: "r1", name: "Pierre précieuse", icon_emoji: "💎", dofus_id: "d1", quantity_per_character: 10, is_kamas: false },
  { id: "r2", name: "Kamas", icon_emoji: "💰", dofus_id: "d1", quantity_per_character: 50000, is_kamas: true },
];

const { ResourcePanel } = await import("@/components/dofus/ResourcePanel");

describe("ResourcePanel", () => {
  it("renders all resource names and base quantities", () => {
    render(<ResourcePanel resources={resources} dofusColor="#22c55e" />);
    expect(screen.getByText("Pierre précieuse")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Kamas")).toBeInTheDocument();
    // 50000 formatted as fr-FR = "50 000" (non-breaking space in fr-FR locale)
    expect(screen.getByText(/50[\s\u00a0]?000/)).toBeInTheDocument();
  });

  it("multiplies quantities when multiplier ×3 is clicked", () => {
    render(<ResourcePanel resources={resources} dofusColor="#22c55e" />);
    fireEvent.click(screen.getByText("×3"));
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText(/150[\s\u00a0]?000/)).toBeInTheDocument();
  });

  it("renders resource emoji icons", () => {
    render(<ResourcePanel resources={resources} dofusColor="#22c55e" />);
    expect(screen.getByText("💎")).toBeInTheDocument();
    expect(screen.getByText("💰")).toBeInTheDocument();
  });
});
