import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { AggregatedResource } from "@dofus-tracker/types";

const resources: AggregatedResource[] = [
  { name: "Pierre précieuse", quantity: 10, is_kamas: false },
  { name: "Kamas", quantity: 50000, is_kamas: true },
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
});
