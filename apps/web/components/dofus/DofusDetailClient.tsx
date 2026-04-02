"use client";

import { useEffect, useState } from "react";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { useSupabase } from "@/app/providers";
import {
  getQuestsForDofus,
  getResourcesForDofus,
  toggleQuestCompletion,
  bulkCompleteSection,
} from "@dofus-tracker/db";
import { DofusHeader } from "./DofusHeader";
import { QuestSection } from "./QuestSection";
import { ResourcePanel } from "./ResourcePanel";
import type { Dofus, QuestWithChain, Resource, QuestSection as QuestSectionType } from "@dofus-tracker/types";

interface Props {
  dofus: Dofus;
  allDofus: Dofus[];
  userId: string;
}

export function DofusDetailClient({ dofus, allDofus, userId: _userId }: Props) {
  const supabase = useSupabase();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);

  const [quests, setQuests] = useState<QuestWithChain[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCharacterId) {
      setQuests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      getQuestsForDofus(supabase, dofus.id, activeCharacterId),
      getResourcesForDofus(supabase, dofus.id),
    ])
      .then(([q, r]) => {
        setQuests(q);
        setResources(r);
      })
      .finally(() => setLoading(false));
  }, [supabase, dofus.id, activeCharacterId]);

  async function handleToggle(questId: string, completed: boolean) {
    if (!activeCharacterId) return;
    // Optimistic update
    setQuests((prev) =>
      prev.map((q) =>
        q.id === questId ? { ...q, is_completed: completed } : q
      )
    );
    try {
      await toggleQuestCompletion(supabase, activeCharacterId, questId, completed);
    } catch {
      // Rollback on error
      setQuests((prev) =>
        prev.map((q) =>
          q.id === questId ? { ...q, is_completed: !completed } : q
        )
      );
    }
  }

  async function handleBulkComplete(section: QuestSectionType) {
    if (!activeCharacterId) return;
    setQuests((prev) =>
      prev.map((q) =>
        q.chain.section === section ? { ...q, is_completed: true } : q
      )
    );
    try {
      await bulkCompleteSection(supabase, activeCharacterId, dofus.id, section);
    } catch {
      // Reload quests from server on failure
      const fresh = await getQuestsForDofus(supabase, dofus.id, activeCharacterId);
      setQuests(fresh);
    }
  }

  const prerequisites = quests.filter((q) => q.chain.section === "prerequisite");
  const mainQuests = quests.filter((q) => q.chain.section === "main");
  const completedCount = quests.filter((q) => q.is_completed).length;

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
              {mainQuests.length > 0 && (
                <QuestSection
                  title="Chaîne principale"
                  quests={mainQuests}
                  dofusColor={dofus.color}
                  onToggle={handleToggle}
                  onBulkComplete={() => handleBulkComplete("main")}
                />
              )}
            </>
          )}
        </div>

        {/* Right column — sticky resource panel */}
        <div className="lg:w-80 lg:shrink-0">
          <div className="lg:sticky lg:top-20">
            <ResourcePanel resources={resources} dofusColor={dofus.color} />
          </div>
        </div>
      </div>
    </main>
  );
}
