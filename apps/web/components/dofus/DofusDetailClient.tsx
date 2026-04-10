"use client";

import { useEffect, useState } from "react";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { useSupabase } from "@/app/providers";
import {
  getQuestsForDofus,
  toggleQuestCompletion,
  bulkCompleteSection,
  bulkUncompleteSection,
} from "@dofus-tracker/db";
import { DofusHeader } from "./DofusHeader";
import { QuestSection } from "./QuestSection";
import { ResourcePanel } from "./ResourcePanel";
import type { Dofus, QuestWithChain, QuestSection as QuestSectionType, AggregatedResource, Alignment, AlignmentOrder, JobVariant } from "@dofus-tracker/types";

const SECTION_NOTES: Record<string, Record<string, string>> = {
  "dofus-cauchemar": {
    "Prérequis - La fin": 'Lancez la quête "Les quatre volontés" qui vous demande de faire les quatre donjons de l\'éliocalypse. Une fois les quatre donjons terminés, vous pouvez valider la quête.',
  },
};

const ALIGNMENT_LABELS: Record<Alignment, string> = {
  neutre: "Neutre",
  bontarien: "Bontarien",
  brakmarien: "Brakmarien",
};

const ORDER_LABELS: Record<AlignmentOrder, string> = {
  "coeur-vaillant": "Cœur Vaillant",
  "oeil-attentif": "Œil Attentif",
  "esprit-salvateur": "Esprit Salvateur",
  "coeur-saignant": "Cœur Saignant",
  "oeil-putride": "Œil Putride",
  "esprit-malsain": "Esprit Malsain",
};

const BONTA_ORDERS: AlignmentOrder[] = ["coeur-vaillant", "oeil-attentif", "esprit-salvateur"];
const BRAKMAR_ORDERS: AlignmentOrder[] = ["coeur-saignant", "oeil-putride", "esprit-malsain"];

interface Props {
  dofus: Dofus;
  allDofus: Dofus[];
  userId: string;
  highlight: string | null;
}

export function DofusDetailClient({ dofus, allDofus, userId: _userId, highlight }: Props) {
  const supabase = useSupabase();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);

  const [quests, setQuests] = useState<QuestWithChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlignment, setSelectedAlignment] = useState<Alignment | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AlignmentOrder | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobVariant | null>(null);
  const [questFilter, setQuestFilter] = useState("");

  // Load persisted alignment from localStorage
  useEffect(() => {
    if (!activeCharacterId) return;
    const key = `alignment_${dofus.id}_${activeCharacterId}`;
    const orderKey = `alignment_order_${dofus.id}_${activeCharacterId}`;
    const jobKey = `job_variant_${dofus.id}_${activeCharacterId}`;
    const saved = localStorage.getItem(key) as Alignment | null;
    const savedOrder = localStorage.getItem(orderKey) as AlignmentOrder | null;
    const savedJob = localStorage.getItem(jobKey) as JobVariant | null;
    setSelectedAlignment(saved);
    setSelectedOrder(savedOrder);
    setSelectedJob(savedJob);
  }, [dofus.id, activeCharacterId]);

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

  useEffect(() => {
    if (!highlight || loading) return;
    const el = document.querySelector(`[data-quest-slug="${highlight}"]`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [highlight, loading]);

  function handleAlignmentChange(alignment: Alignment | null) {
    setSelectedAlignment(alignment);
    setSelectedOrder(null);
    if (!activeCharacterId) return;
    const key = `alignment_${dofus.id}_${activeCharacterId}`;
    const orderKey = `alignment_order_${dofus.id}_${activeCharacterId}`;
    if (alignment) localStorage.setItem(key, alignment);
    else localStorage.removeItem(key);
    localStorage.removeItem(orderKey);
  }

  function handleOrderChange(order: AlignmentOrder | null) {
    setSelectedOrder(order);
    if (!activeCharacterId) return;
    const orderKey = `alignment_order_${dofus.id}_${activeCharacterId}`;
    if (order) localStorage.setItem(orderKey, order);
    else localStorage.removeItem(orderKey);
  }

  function handleJobChange(job: JobVariant | null) {
    setSelectedJob(job);
    if (!activeCharacterId) return;
    const jobKey = `job_variant_${dofus.id}_${activeCharacterId}`;
    if (job) localStorage.setItem(jobKey, job);
    else localStorage.removeItem(jobKey);
  }

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

  async function handleBulkComplete(questIds: string[]) {
    if (!activeCharacterId) return;
    setQuests((prev) =>
      prev.map((q) => (questIds.includes(q.id) ? { ...q, is_completed: true } : q))
    );
    try {
      await bulkCompleteSection(supabase, activeCharacterId, questIds);
    } catch {
      const fresh = await getQuestsForDofus(supabase, dofus.id, activeCharacterId);
      setQuests(fresh);
    }
  }

  async function handleBulkUncomplete(questIds: string[]) {
    if (!activeCharacterId) return;
    setQuests((prev) =>
      prev.map((q) => (questIds.includes(q.id) ? { ...q, is_completed: false } : q))
    );
    try {
      await bulkUncompleteSection(supabase, activeCharacterId, questIds);
    } catch {
      const fresh = await getQuestsForDofus(supabase, dofus.id, activeCharacterId);
      setQuests(fresh);
    }
  }

  // Determine if this dofus has alignment quests
  const alignments = [...new Set(quests.map((q) => q.chain.alignment).filter(Boolean))] as Alignment[];
  const hasAlignment = alignments.length > 0;
  const hasNeutre = alignments.includes("neutre");
  const hasJobVariant = quests.some((q) => q.chain.job_variant !== null);

  // Filter quests by selected alignment and job variant
  function isQuestVisible(q: QuestWithChain): boolean {
    // Job variant filter: hide quests of the non-selected job (or all job-specific quests if none selected)
    if (q.chain.job_variant !== null) {
      if (!selectedJob || q.chain.job_variant !== selectedJob) return false;
    }

    const a = q.chain.alignment;
    if (a === null) return true;
    if (!hasAlignment) return true;
    if (!selectedAlignment || a !== selectedAlignment) return false;
    if (q.chain.alignment_order !== null) {
      return q.chain.alignment_order === selectedOrder;
    }
    return true;
  }

  const visibleQuests = quests.filter(isQuestVisible);
  const completedCount = visibleQuests.filter((q) => q.is_completed).length;

  // Group all quests by sub_section, keeping section info for bulk actions
  const allGroups: Array<{ title: string; section: QuestSectionType; quests: typeof visibleQuests }> = [];
  for (const quest of visibleQuests) {
    const isPrereq = quest.chain.section === "prerequisite" || quest.chain.sub_section?.startsWith("Prérequis");
    const title = quest.chain.sub_section ?? (isPrereq ? "Prérequis" : "Les quêtes");
    const existing = allGroups.find((g) => g.title === title);
    if (existing) existing.quests.push(quest);
    else allGroups.push({ title, section: quest.chain.section as QuestSectionType, quests: [quest] });
  }
  // Prérequis* groups always come before others, then sort by min order_index to preserve game order
  allGroups.sort((a, b) => {
    const aIsPrereq = a.title.startsWith("Prérequis");
    const bIsPrereq = b.title.startsWith("Prérequis");
    if (aIsPrereq && !bIsPrereq) return -1;
    if (!aIsPrereq && bIsPrereq) return 1;
    const aMin = Math.min(...a.quests.map((q) => q.chain.order_index));
    const bMin = Math.min(...b.quests.map((q) => q.chain.order_index));
    return aMin - bMin;
  });

  const displayedGroups = questFilter.trim()
    ? allGroups
        .map((g) => ({
          ...g,
          quests: g.quests.filter((q) =>
            q.name.toLowerCase().includes(questFilter.toLowerCase())
          ),
        }))
        .filter((g) => g.quests.length > 0)
    : allGroups;

  // Orders available for current alignment selection
  const availableOrders: AlignmentOrder[] =
    selectedAlignment === "bontarien" ? BONTA_ORDERS :
    selectedAlignment === "brakmarien" ? BRAKMAR_ORDERS : [];

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
            quests={visibleQuests}
            completedCount={completedCount}
          />

          {hasAlignment && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-300">Alignement</p>
              <div className="flex flex-wrap gap-2">
                {hasNeutre && (
                  <button
                    onClick={() => handleAlignmentChange(selectedAlignment === "neutre" ? null : "neutre")}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedAlignment === "neutre"
                        ? "bg-gray-500 text-white"
                        : "bg-white/10 text-gray-400 hover:bg-white/20"
                    }`}
                  >
                    {ALIGNMENT_LABELS.neutre}
                  </button>
                )}
                <button
                  onClick={() => handleAlignmentChange(selectedAlignment === "bontarien" ? null : "bontarien")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedAlignment === "bontarien"
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 text-gray-400 hover:bg-white/20"
                  }`}
                >
                  {ALIGNMENT_LABELS.bontarien}
                </button>
                <button
                  onClick={() => handleAlignmentChange(selectedAlignment === "brakmarien" ? null : "brakmarien")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedAlignment === "brakmarien"
                      ? "bg-red-700 text-white"
                      : "bg-white/10 text-gray-400 hover:bg-white/20"
                  }`}
                >
                  {ALIGNMENT_LABELS.brakmarien}
                </button>
              </div>

              {availableOrders.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500">Ordre (optionnel)</p>
                  <div className="flex flex-wrap gap-2">
                    {availableOrders.map((order) => (
                      <button
                        key={order}
                        onClick={() => handleOrderChange(selectedOrder === order ? null : order)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedOrder === order
                            ? selectedAlignment === "bontarien"
                              ? "bg-blue-600 text-white"
                              : "bg-red-700 text-white"
                            : "bg-white/10 text-gray-400 hover:bg-white/20"
                        }`}
                      >
                        {ORDER_LABELS[order]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {hasJobVariant && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-300">Métier</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleJobChange(selectedJob === "paysan" ? null : "paysan")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedJob === "paysan"
                      ? "bg-yellow-600 text-white"
                      : "bg-white/10 text-gray-400 hover:bg-white/20"
                  }`}
                >
                  Paysan
                </button>
                <button
                  onClick={() => handleJobChange(selectedJob === "alchimiste" ? null : "alchimiste")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedJob === "alchimiste"
                      ? "bg-green-600 text-white"
                      : "bg-white/10 text-gray-400 hover:bg-white/20"
                  }`}
                >
                  Alchimiste
                </button>
              </div>
              {!selectedJob && (
                <p className="text-xs text-gray-500">Sélectionne ton métier pour voir les quêtes correspondantes.</p>
              )}
            </div>
          )}

          {/* Quest filter */}
          <div className="relative">
            <input
              type="text"
              value={questFilter}
              onChange={(e) => setQuestFilter(e.target.value)}
              placeholder="Filtrer les quêtes…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pl-9 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-dofus-green/40 transition-colors"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
            {questFilter && (
              <button
                onClick={() => setQuestFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-sm"
              >
                ✕
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm animate-pulse">Chargement des quêtes…</p>
          ) : (
            <>
              {displayedGroups.map(({ title, quests: groupQuests }) => (
                <QuestSection
                  key={title}
                  title={title}
                  quests={groupQuests}
                  dofusColor={dofus.color}
                  note={SECTION_NOTES[dofus.slug]?.[title]}
                  highlightSlug={highlight}
                  onToggle={handleToggle}
                  onBulkComplete={() => handleBulkComplete(groupQuests.map((q) => q.id))}
                  onBulkUncomplete={() => handleBulkUncomplete(groupQuests.map((q) => q.id))}
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
