"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { useSupabase } from "@/app/providers";
import {
  getAchievementSubcategories,
  getAchievementsForCharacter,
  toggleObjectiveCompletion,
} from "@dofus-tracker/db";
import { AchievementRow } from "./AchievementRow";
import type { AchievementSubcategory, AchievementWithProgress } from "@dofus-tracker/types";

interface Props {
  subcategories: AchievementSubcategory[];
  initialAchievements: AchievementWithProgress[];
  initialCatId: number | null;
}

export function AchievementsClient({ subcategories: initialSubcats, initialAchievements, initialCatId }: Props) {
  const supabase = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);

  const [subcategories, setSubcategories] = useState<AchievementSubcategory[]>(initialSubcats);
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>(initialAchievements);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(initialCatId);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Recharger quand le personnage actif change
  useEffect(() => {
    if (!activeCharacterId) return;
    Promise.all([
      getAchievementSubcategories(supabase, activeCharacterId),
      selectedCatId
        ? getAchievementsForCharacter(supabase, selectedCatId, activeCharacterId)
        : Promise.resolve([]),
    ]).then(([subcats, achs]) => {
      setSubcategories(subcats);
      setAchievements(achs);
    });
  }, [activeCharacterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Charger les succès quand la catégorie change
  useEffect(() => {
    if (!selectedCatId || !activeCharacterId) return;
    setLoading(true);
    getAchievementsForCharacter(supabase, selectedCatId, activeCharacterId)
      .then(setAchievements)
      .catch(console.error)
      .finally(() => setLoading(false));
    const params = new URLSearchParams(searchParams.toString());
    params.set("cat", String(selectedCatId));
    router.replace(`/achievements?${params.toString()}`, { scroll: false });
  }, [selectedCatId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggleObjective(objectiveId: string, questId: string | null, completed: boolean) {
    if (!activeCharacterId) return;
    // Optimistic update
    setAchievements((prev) =>
      prev.map((a) => ({
        ...a,
        objectives: a.objectives.map((o) =>
          o.id === objectiveId
            ? {
                ...o,
                is_completed: completed,
                completion_source: completed
                  ? questId
                    ? ("auto" as const)
                    : ("manual" as const)
                  : null,
              }
            : o
        ),
        completed_count: a.objectives.filter((o) =>
          o.id === objectiveId ? completed : o.is_completed
        ).length,
      }))
    );
    try {
      await toggleObjectiveCompletion(supabase, activeCharacterId, objectiveId, questId, completed);
      const updatedSubcats = await getAchievementSubcategories(supabase, activeCharacterId);
      setSubcategories(updatedSubcats);
    } catch (err) {
      console.error(err);
      // Rollback
      setAchievements((prev) =>
        prev.map((a) => ({
          ...a,
          objectives: a.objectives.map((o) =>
            o.id === objectiveId ? { ...o, is_completed: !completed, completion_source: !completed ? (questId ? ("auto" as const) : ("manual" as const)) : null } : o
          ),
          completed_count: a.objectives.filter((o) =>
            o.id === objectiveId ? !completed : o.is_completed
          ).length,
        }))
      );
    }
  }

  const totalEarnedPoints = subcategories.reduce((sum, s) => sum + s.earned_points, 0);

  const filteredAchievements = search
    ? achievements.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : achievements;

  return (
    <main className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3">
        <h1 className="text-xl font-bold text-yellow-400">🏆 Succès</h1>
        <span className="text-sm text-amber-700 bg-amber-950 px-3 py-0.5 rounded-full font-semibold">
          ⭐ {totalEarnedPoints} pts gagnés
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-white/5 overflow-y-auto py-3">
          {subcategories.map((sub) => (
            <button
              key={sub.subcategory_id}
              onClick={() => setSelectedCatId(sub.subcategory_id)}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left border-l-2 transition-colors
                ${selectedCatId === sub.subcategory_id
                  ? "text-yellow-400 bg-yellow-950/30 border-yellow-500"
                  : "text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5"}
              `}
            >
              <span className="truncate">{sub.subcategory_name}</span>
              <span className={`text-xs ml-2 flex-shrink-0 px-1.5 rounded
                ${selectedCatId === sub.subcategory_id ? "bg-amber-900 text-amber-300" : "bg-gray-800 text-gray-500"}
              `}>
                {sub.completed_achievements}/{sub.total_achievements}
              </span>
            </button>
          ))}
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="px-4 py-2 border-b border-white/5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍  Rechercher un succès…"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-600"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {loading ? (
              <p className="text-gray-500 text-sm">Chargement…</p>
            ) : filteredAchievements.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucun succès trouvé.</p>
            ) : (
              filteredAchievements.map((a) => (
                <AchievementRow
                  key={a.id}
                  achievement={a}
                  onToggleObjective={handleToggleObjective}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
