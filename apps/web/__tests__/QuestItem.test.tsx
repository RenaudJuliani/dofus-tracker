import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { QuestWithChain } from "@dofus-tracker/types";

const questBase: QuestWithChain = {
  id: "q1",
  name: "La Quête du Dofus",
  slug: "la-quete-du-dofus",
  dofuspourlesnoobs_url: "https://dofuspourlesnoobs.com/quete-du-dofus",
  created_at: "2024-01-01",
  chain: {
    id: "c1",
    dofus_id: "d1",
    quest_id: "q1",
    section: "main",
    sub_section: null,
    order_index: 1,
    group_id: null,
    quest_types: ["combat_solo"],
    combat_count: 1,
    is_avoidable: false,
    alignment: null,
    alignment_order: null,
    job_variant: null,
    note: null,
  },
  is_completed: false,
  shared_dofus_ids: [],
  resources: [],
};

const { QuestItem } = await import("@/components/dofus/QuestItem");

describe("QuestItem", () => {
  it("renders quest name as a link to dofuspourlesnoobs", () => {
    render(
      <QuestItem quest={questBase} dofusColor="#22c55e" onToggle={vi.fn()} />
    );
    const link = screen.getByRole("link", { name: /La Quête du Dofus/i });
    expect(link).toHaveAttribute("href", "https://dofuspourlesnoobs.com/quete-du-dofus");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("calls onToggle with true when unchecked checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(
      <QuestItem quest={questBase} dofusColor="#22c55e" onToggle={onToggle} />
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("q1", true);
  });

  it("calls onToggle with false when checked checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(
      <QuestItem
        quest={{ ...questBase, is_completed: true }}
        dofusColor="#22c55e"
        onToggle={onToggle}
      />
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("q1", false);
  });

  it("shows cross-dofus badge when shared_dofus_ids is non-empty", () => {
    render(
      <QuestItem
        quest={{ ...questBase, shared_dofus_ids: ["d2", "d3"] }}
        dofusColor="#22c55e"
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByTitle(/Requise par 2 autre/i)).toBeInTheDocument();
  });

  it("shows combat_solo badge", () => {
    render(
      <QuestItem quest={questBase} dofusColor="#22c55e" onToggle={vi.fn()} />
    );
    expect(screen.getByText("Combat solo")).toBeInTheDocument();
  });
});
