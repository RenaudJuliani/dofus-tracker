"use client";

import { useState } from "react";
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
  highlighted?: boolean;
}

export function QuestItem({ quest, dofusColor, onToggle, highlighted = false }: Props) {
  const { chain, is_completed, shared_dofus_ids, resources } = quest;
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [copiedResource, setCopiedResource] = useState<string | null>(null);
  const hasResources = resources.length > 0;

  function copyResource(name: string) {
    navigator.clipboard.writeText(name).then(() => {
      setCopiedResource(name);
      setTimeout(() => setCopiedResource(null), 1500);
    });
  }

  return (
    <div
      data-quest-slug={quest.slug}
      className={`rounded-xl transition-all ${is_completed ? "opacity-60" : ""} ${highlighted ? "ring-2 ring-offset-1 ring-offset-dofus-dark animate-highlight-fade" : ""}`}
      style={{
        background: is_completed ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
        ...(highlighted ? { "--tw-ring-color": dofusColor } as React.CSSProperties : {}),
      }}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <input
          type="checkbox"
          checked={is_completed}
          onChange={(e) => onToggle(quest.id, e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#4ade80] rounded"
          aria-label={quest.name}
        />

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
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

          {chain.note && !chain.group_id && (
            <p className="text-xs text-cyan-400/80 bg-cyan-400/5 border border-cyan-400/20 rounded-lg px-2 py-1.5">
              {chain.note}
            </p>
          )}

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

        {/* Right: order + resources toggle */}
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <span className="text-xs text-gray-600">#{chain.order_index}</span>
          {hasResources && (
            <button
              onClick={() => setResourcesExpanded((v) => !v)}
              className="text-xs px-2 py-0.5 rounded transition-colors"
              style={{
                background: resourcesExpanded ? `${dofusColor}22` : "rgba(255,255,255,0.06)",
                color: resourcesExpanded ? dofusColor : "#9ca3af",
                border: `1px solid ${resourcesExpanded ? dofusColor + "44" : "transparent"}`,
              }}
              title="Ressources requises"
            >
              📦 {resources.length}
            </button>
          )}
        </div>
      </div>

      {/* Expandable resources */}
      {resourcesExpanded && (
        <div className="border-t border-white/5 px-4 py-2 space-y-0.5">
          {resources.map((r) => (
            <button
              key={r.id}
              onClick={() => copyResource(r.name)}
              className="w-full flex justify-between items-center py-1 px-2 rounded hover:bg-white/5 transition-colors text-left group"
              title={`Copier "${r.name}"`}
            >
              <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                {copiedResource === r.name ? (
                  <span className="text-dofus-green font-semibold">✓ Copié !</span>
                ) : r.name}
              </span>
              <span className="text-xs font-semibold" style={{ color: dofusColor }}>
                ×{r.quantity}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
