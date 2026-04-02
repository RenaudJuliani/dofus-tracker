"use client";

import type { QuestWithChain, QuestType } from "@dofus-tracker/types";

const BADGE_CONFIG: Record<QuestType, { label: string; color: string }> = {
  combat_solo: { label: "Combat solo", color: "#ef4444" },
  combat_groupe: { label: "Groupe", color: "#f97316" },
  donjon: { label: "Donjon", color: "#a855f7" },
  metier: { label: "Métier", color: "#eab308" },
  boss: { label: "Boss", color: "#dc2626" },
  succes: { label: "Succès", color: "#06b6d4" },
  horaires: { label: "Horaires", color: "#64748b" },
};

interface Props {
  quest: QuestWithChain;
  dofusColor: string;
  onToggle: (questId: string, completed: boolean) => void;
}

export function QuestItem({ quest, dofusColor: _dofusColor, onToggle }: Props) {
  const { chain, is_completed, shared_dofus_ids } = quest;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-colors ${
        is_completed ? "opacity-60" : ""
      }`}
      style={{
        background: is_completed
          ? "rgba(255,255,255,0.02)"
          : "rgba(255,255,255,0.04)",
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={is_completed}
        onChange={(e) => onToggle(quest.id, e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#4ade80] rounded"
        aria-label={quest.name}
      />

      {/* Quest info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quest name link */}
          <a
            href={quest.dofuspourlesnoobs_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-sm font-medium hover:underline transition-colors ${
              is_completed ? "line-through text-gray-500" : "text-white"
            }`}
          >
            {quest.name}
          </a>

          {/* Cross-dofus badge */}
          {shared_dofus_ids.length > 0 && (
            <span
              title={`Requise par ${shared_dofus_ids.length} autre${shared_dofus_ids.length > 1 ? "s" : ""} Dofus`}
              className="text-xs px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: "#3b82f622", color: "#60a5fa", border: "1px solid #3b82f644" }}
            >
              ×{shared_dofus_ids.length + 1}
            </span>
          )}
        </div>

        {/* Badges row */}
        <div className="flex items-center flex-wrap gap-1.5">
          {chain.quest_types.map((type) => {
            const badge = BADGE_CONFIG[type];
            return (
              <span
                key={type}
                className="text-xs px-2 py-0.5 rounded-md font-medium"
                style={{
                  background: `${badge.color}22`,
                  color: badge.color,
                  border: `1px solid ${badge.color}44`,
                }}
              >
                {badge.label}
                {type === "combat_solo" && chain.combat_count && chain.combat_count > 1
                  ? ` ×${chain.combat_count}`
                  : ""}
              </span>
            );
          })}

          {chain.is_avoidable && (
            <span className="text-xs px-2 py-0.5 rounded-md font-medium text-gray-400 border border-gray-700">
              Évitable
            </span>
          )}
        </div>
      </div>

      {/* Order index */}
      <span className="text-xs text-gray-600 shrink-0 mt-0.5">#{chain.order_index}</span>
    </div>
  );
}
