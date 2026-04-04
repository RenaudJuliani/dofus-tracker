"use client";

import { useEffect, useState } from "react";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { useSupabase } from "@/app/providers";
import {
  getQuestsForDofus,
  toggleQuestCompletion,
  bulkCompleteSection,
} from "@dofus-tracker/db";
import { DofusHeader } from "./DofusHeader";
import { QuestSection } from "./QuestSection";
import { ResourcePanel } from "./ResourcePanel";
import type { Dofus, QuestWithChain, AggregatedResource, QuestSection as QuestSectionType } from "@dofus-tracker/types";

interface Props {
  dofus: Dofus;
  allDofus: Dofus[];
  userId: string;
}

export function DofusDetailClient({ dofus, allDofus, userId: _userId }: Props) {
  const supabase = useSupabase();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);

  const [quests, setQuests] = useState<QuestWithChain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCharacterId) {
      setQuests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getQuestsForDofus(supabase, dofus.id, activeCharacterId)
      .then(setQuests)
      .finally(() => setLoading(false));
  }, [supabase, dofus.id, activeCharacterId]);

  async function handleToggle(questId: string, completed: boolean) {
    if (!activeCharacterId) return;
    setQuests((prev) =>
      prev.map((q) => (q.id === questId ? { ...q, is_completed: completed } : q))
    );
    try {
      await toggleQuestCompletion(supabase, activeCharacterId, questId, completed);
    } catch {
      setQuests((prev) =>
        prev.map((q) => (q.id === questId ? { ...q, is_completed: !completed } : q))
      );
    }
  }

  async function handleBulkComplete(section: QuestSectionType) {
    if (!activeCharacterId) return;
    setQuests((prev) =>
      prev.map((q) => (q.chain.section === section ? { ...q, is_completed: true } : q))
    );
    try {
      await bulkCompleteSection(supabase, activeCharacterId, dofus.id, section);
    } catch {
      const fresh = await getQuestsForDofus(supabase, dofus.id, activeCharacterId);
      setQuests(fresh);
    }
  }

  const prerequisites = quests.filter((q) => q.chain.section === "prerequisite");
  const mainQuests = quests.filter((q) => q.chain.section === "main");
  const completedCount = quests.filter((q) => q.is_completed).length;

  // Group main quests by sub_section
  const mainQuestGroups: Array<{ title: string; quests: typeof mainQuests }> = [];
  for (const quest of mainQuests) {
    const title = quest.chain.sub_section ?? "Les quêtes";
    const existing = mainQuestGroups.find((g) => g.title === title);
    if (existing) existing.quests.push(quest);
    else mainQuestGroups.push({ title, quests: [quest] });
  }

  // Aggregate resources from all quests
  const aggregatedResources: AggregatedResource[] = Object.values(
    quests.reduce(
      (acc, quest) => {
        for (const r of quest.resources) {
          const existing = acc[r.name];
          acc[r.name] = {
            name: r.name,
            quantity: (existing?.quantity ?? 0) + r.quantity,
            is_kamas: r.is_kamas,
          };
        }
        return acc;
      },
      {} as Record<string, AggregatedResource>
    )
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-6">
          <DofusHeader
            dofus={dofus}
            allDofus={allDofus}
            quests={quests}
            completedCount={completedCount}
          />

          {loading ? (
            <p className="text-gray-400 text-sm animate-pulse">Chargement des quêtes…</p>
          ) : (
            <>
              {prerequisites.length > 0 && (
                <QuestSection
                  title="Prérequis"
                  quests={prerequisites}
                  dofusColor={dofus.color}
                  onToggle={handleToggle}
                  onBulkComplete={() => handleBulkComplete("prerequisite")}
                />
              )}
              {mainQuestGroups.map(({ title, quests: groupQuests }) => (
                <QuestSection
                  key={title}
                  title={title}
                  quests={groupQuests}
                  dofusColor={dofus.color}
                  onToggle={handleToggle}
                  onBulkComplete={() => handleBulkComplete("main")}
                />
              ))}
            </>
          )}
        </div>

        {/* Right column — sticky resource panel */}
        {aggregatedResources.length > 0 && (
          <div className="lg:w-80 lg:shrink-0">
            <div className="lg:sticky lg:top-20">
              <ResourcePanel resources={aggregatedResources} dofusColor={dofus.color} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
