"use client";

import { useState } from "react";
import type { AchievementWithProgress, AchievementObjectiveWithStatus } from "@dofus-tracker/types";

interface Props {
  achievement: AchievementWithProgress;
  onToggleObjective: (objectiveId: string, questId: string | null, completed: boolean) => void;
}

function statusColor(completed_count: number, total_count: number): string {
  if (total_count === 0) return "bg-gray-700";
  if (completed_count === total_count) return "bg-green-500";
  if (completed_count > 0) return "bg-yellow-500";
  return "bg-gray-600";
}

function ObjectiveCheckbox({ obj, onToggle }: {
  obj: AchievementObjectiveWithStatus;
  onToggle: (objectiveId: string, questId: string | null, completed: boolean) => void;
}) {
  const isAuto = obj.completion_source === "auto";
  const isClickable = !isAuto;

  function handleClick() {
    if (isClickable) {
      onToggle(obj.id, obj.quest_id, !obj.is_completed);
    }
  }

  return (
    <div
      role="checkbox"
      aria-checked={obj.is_completed}
      aria-label={obj.description}
      onClick={handleClick}
      className={`flex items-center gap-2 py-1.5 text-sm ${isClickable ? "cursor-pointer" : "cursor-default"}`}
    >
      <span
        className={`w-4 h-4 rounded flex items-center justify-center border text-xs flex-shrink-0
          ${obj.is_completed && isAuto ? "bg-blue-900 border-blue-500 text-blue-400" : ""}
          ${obj.is_completed && !isAuto ? "bg-green-900 border-green-500 text-green-400" : ""}
          ${!obj.is_completed ? "border-gray-600" : ""}
        `}
      >
        {obj.is_completed ? "✓" : ""}
      </span>
      <span className={obj.is_completed ? "line-through text-gray-500" : "text-gray-200"}>
        {obj.description}
      </span>
      {isAuto && (
        <span className="ml-auto text-xs text-blue-500 italic">auto</span>
      )}
    </div>
  );
}

export function AchievementRow({ achievement, onToggleObjective }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { completed_count, total_count } = achievement;
  const isFullyDone = total_count > 0 && completed_count === total_count;

  return (
    <div className={`rounded-lg border mb-2 overflow-hidden
      ${isFullyDone ? "border-green-800" : "border-gray-700"}
    `}>
      {/* Header row */}
      <button
        aria-label={achievement.name}
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
      >
        {/* Left color bar */}
        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${statusColor(completed_count, total_count)}`} />

        {/* Icon placeholder */}
        <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">
          🏆
        </div>

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-100 truncate">{achievement.name}</p>
          <p className="text-xs text-gray-400 truncate">{achievement.description}</p>
        </div>

        {/* Progress + points */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs ${isFullyDone ? "text-green-400" : completed_count > 0 ? "text-yellow-400" : "text-gray-500"}`}>
            {completed_count}/{total_count}
          </span>
          <span className={`text-sm font-bold px-2 py-0.5 rounded
            ${isFullyDone ? "bg-green-900 text-green-300" : "bg-gray-800 text-yellow-400"}
          `}>
            {achievement.points}
          </span>
        </div>
      </button>

      {/* Detail panel */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-gray-900/50 border-t border-gray-700/50">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Objectifs</p>
          <div className="pl-2">
            {achievement.objectives.map((obj) => (
              <ObjectiveCheckbox key={obj.id} obj={obj} onToggle={onToggleObjective} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
