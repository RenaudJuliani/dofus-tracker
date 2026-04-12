import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { AchievementWithProgress } from "@dofus-tracker/types";

const baseAchievement: AchievementWithProgress = {
  id: 568,
  name: "Les mystères de Frigost",
  description: "Terminer les quêtes suivantes.",
  points: 30,
  level_required: 0,
  subcategory_id: 51,
  subcategory_name: "Île de Frigost",
  order_index: 0,
  completed_count: 3,
  total_count: 5,
  objectives: [
    { id: "obj-1", achievement_id: 568, order_index: 0, description: "Œuf à la neige", quest_id: "q1", is_completed: true, completion_source: "auto" },
    { id: "obj-2", achievement_id: 568, order_index: 1, description: "L'ère glaciaire", quest_id: "q2", is_completed: true, completion_source: "manual" },
    { id: "obj-3", achievement_id: 568, order_index: 2, description: "Commission impossible", quest_id: null, is_completed: true, completion_source: "manual" },
    { id: "obj-4", achievement_id: 568, order_index: 3, description: "Épilogue hivernal", quest_id: null, is_completed: false, completion_source: null },
    { id: "obj-5", achievement_id: 568, order_index: 4, description: "Objectif lié non fait", quest_id: "q5", is_completed: false, completion_source: null },
  ],
};

const { AchievementRow } = await import("@/components/achievements/AchievementRow");

describe("AchievementRow", () => {
  it("affiche le nom et la description", () => {
    render(<AchievementRow achievement={baseAchievement} onToggleObjective={vi.fn()} />);
    expect(screen.getByText("Les mystères de Frigost")).toBeInTheDocument();
    expect(screen.getByText("Terminer les quêtes suivantes.")).toBeInTheDocument();
  });

  it("affiche le badge X/N objectifs", () => {
    render(<AchievementRow achievement={baseAchievement} onToggleObjective={vi.fn()} />);
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("affiche le badge de points", () => {
    render(<AchievementRow achievement={baseAchievement} onToggleObjective={vi.fn()} />);
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("déplie les objectifs au clic sur la row", () => {
    render(<AchievementRow achievement={baseAchievement} onToggleObjective={vi.fn()} />);
    expect(screen.queryByText("Œuf à la neige")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Les mystères de Frigost/i }));
    expect(screen.getByText("Œuf à la neige")).toBeInTheDocument();
  });

  it("appelle onToggleObjective pour un objectif sans quest_id non complété", () => {
    const onToggle = vi.fn();
    render(<AchievementRow achievement={baseAchievement} onToggleObjective={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /Les mystères de Frigost/i }));
    fireEvent.click(screen.getByLabelText("Épilogue hivernal"));
    expect(onToggle).toHaveBeenCalledWith("obj-4", null, true);
  });

  it("appelle onToggleObjective pour un objectif avec quest_id non complété", () => {
    const onToggle = vi.fn();
    render(<AchievementRow achievement={baseAchievement} onToggleObjective={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /Les mystères de Frigost/i }));
    fireEvent.click(screen.getByLabelText("Objectif lié non fait"));
    expect(onToggle).toHaveBeenCalledWith("obj-5", "q5", true);
  });

  it("ne déclenche pas onToggleObjective pour un objectif auto", () => {
    const onToggle = vi.fn();
    render(<AchievementRow achievement={baseAchievement} onToggleObjective={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /Les mystères de Frigost/i }));
    fireEvent.click(screen.getByLabelText("Œuf à la neige"));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
