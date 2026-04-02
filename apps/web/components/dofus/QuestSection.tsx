"use client";

import type { QuestWithChain } from "@dofus-tracker/types";
import { QuestItem } from "./QuestItem";

interface Props {
  title: string;
  quests: QuestWithChain[];
  dofusColor: string;
  onToggle: (questId: string, completed: boolean) => void;
  onBulkComplete: () => void;
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

export function QuestSection({ title, quests, dofusColor, onToggle, onBulkComplete }: Props) {
  const completedCount = quests.filter((q) => q.is_completed).length;
  const grouped = groupQuests(quests);

  return (
    <section className="glass rounded-2xl overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-white">{title}</h2>
          <span className="text-sm text-gray-400">
            {completedCount}/{quests.length}
          </span>
        </div>
        <button
          onClick={onBulkComplete}
          className="text-xs btn-secondary px-3 py-1"
          disabled={completedCount === quests.length}
        >
          Tout cocher
        </button>
      </div>

      {/* Quest list */}
      <div className="divide-y divide-white/[0.04] p-2 space-y-0.5">
        {grouped.map((item, idx) => {
          if (Array.isArray(item)) {
            // Group box
            return (
              <div
                key={item[0].chain.group_id ?? idx}
                className="rounded-xl overflow-hidden border"
                style={{ borderColor: "#f9731644", background: "#f9731608" }}
              >
                <div className="px-3 py-1.5 text-xs font-semibold text-orange-400 border-b border-orange-400/20">
                  ⚠ Faire ensemble
                </div>
                {item.map((quest) => (
                  <QuestItem
                    key={quest.id}
                    quest={quest}
                    dofusColor={dofusColor}
                    onToggle={onToggle}
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
            />
          );
        })}
      </div>
    </section>
  );
}
