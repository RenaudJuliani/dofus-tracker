"use client";

import { useState } from "react";
import type { QuestWithChain } from "@dofus-tracker/types";
import { QuestItem } from "./QuestItem";

interface Props {
  title: string;
  quests: QuestWithChain[];
  dofusColor: string;
  note?: string;
  highlightSlug?: string | null;
  onToggle: (questId: string, completed: boolean) => void;
  onBulkComplete: () => void;
  onBulkUncomplete: () => void;
}

// Groups consecutive quests with the same group_id into arrays
function groupQuests(quests: QuestWithChain[]): Array<QuestWithChain | QuestWithChain[]> {
  const result: Array<QuestWithChain | QuestWithChain[]> = [];
  const seen = new Map<string, QuestWithChain[]>();

  for (const quest of quests) {
    if (!quest.chain.group_id) {
      result.push(quest);
    } else {
      const existing = seen.get(quest.chain.group_id);
      if (existing) {
        existing.push(quest);
      } else {
        const group: QuestWithChain[] = [quest];
        seen.set(quest.chain.group_id, group);
        result.push(group);
      }
    }
  }
  return result;
}

export function QuestSection({ title, quests, dofusColor, note, highlightSlug, onToggle, onBulkComplete, onBulkUncomplete }: Props) {
  const [expanded, setExpanded] = useState(true);
  const completedCount = quests.filter((q) => q.is_completed).length;
  const allCompleted = completedCount === quests.length;
  const grouped = groupQuests(quests);

  return (
    <section className="glass rounded-2xl overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
        <button
          className="flex items-center gap-3 flex-1 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="text-gray-400 text-xs w-3 shrink-0">{expanded ? "▼" : "▶"}</span>
          <h2 className="font-bold text-white">{title}</h2>
          <span className="text-sm text-gray-400">
            {completedCount}/{quests.length}
          </span>
        </button>
        <button
          onClick={allCompleted ? onBulkUncomplete : onBulkComplete}
          className="text-xs btn-secondary px-3 py-1"
          disabled={quests.length === 0}
        >
          {allCompleted ? "Tout décocher" : "Tout cocher"}
        </button>
      </div>

      {/* Quest list */}
      {expanded && <div className="divide-y divide-white/[0.04] p-2 space-y-0.5">
        {note && (
          <p className="text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2 mb-1">
            {note}
          </p>
        )}
        {grouped.map((item, idx) => {
          if (Array.isArray(item)) {
            const groupNote = item[0].chain.note;
            const borderColor = groupNote ? "#22d3ee44" : "#f9731644";
            const bgColor = groupNote ? "#22d3ee08" : "#f9731608";
            const headerColor = groupNote ? "text-cyan-400" : "text-orange-400";
            const borderHeaderColor = groupNote ? "border-cyan-400/20" : "border-orange-400/20";
            return (
              <div
                key={item[0].chain.group_id ?? idx}
                className="rounded-xl overflow-hidden border"
                style={{ borderColor, background: bgColor }}
              >
                <div className={`px-3 py-1.5 text-xs font-semibold border-b ${headerColor} ${borderHeaderColor}`}>
                  {groupNote ?? "⚠ Faire ensemble"}
                </div>
                {item.map((quest) => (
                  <QuestItem
                    key={quest.id}
                    quest={quest}
                    dofusColor={dofusColor}
                    onToggle={onToggle}
                    highlighted={highlightSlug === quest.slug}
                  />
                ))}
              </div>
            );
          }
          return (
            <QuestItem
              key={item.id}
              quest={item}
              dofusColor={dofusColor}
              onToggle={onToggle}
              highlighted={highlightSlug === item.slug}
            />
          );
        })}
      </div>}
    </section>
  );
}
