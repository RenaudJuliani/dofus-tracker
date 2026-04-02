"use client";

import { useEffect, useState, useCallback } from "react";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { useSupabase } from "@/app/providers";
import { getDofusProgressForCharacter } from "@dofus-tracker/db";
import { DofusCard } from "./DofusCard";
import type { Dofus, DofusProgress } from "@dofus-tracker/types";

interface Props {
  dofusList: Dofus[];
}

export function DofusGrid({ dofusList }: Props) {
  const supabase = useSupabase();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const [progressMap, setProgressMap] = useState<Map<string, DofusProgress>>(new Map());
  const [loading, setLoading] = useState(false);

  const loadProgress = useCallback(async () => {
    if (!activeCharacterId) {
      setProgressMap(new Map());
      return;
    }
    setLoading(true);
    try {
      const rows = await getDofusProgressForCharacter(supabase, activeCharacterId);
      setProgressMap(new Map(rows.map((r) => [r.dofus_id, r])));
    } finally {
      setLoading(false);
    }
  }, [supabase, activeCharacterId]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const primordial = dofusList.filter((d) => d.type === "primordial");
  const secondaire = dofusList.filter((d) => d.type === "secondaire");

  return (
    <div className="space-y-10">
      {loading && (
        <p className="text-center text-gray-400 text-sm animate-pulse">
          Chargement de la progression…
        </p>
      )}

      {[
        { label: "Primordiaux", list: primordial },
        { label: "Secondaires", list: secondaire },
      ].map(({ label, list }) =>
        list.length > 0 ? (
          <section key={label}>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-dofus-green inline-block" />
              {label}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {list.map((dofus) => (
                <DofusCard
                  key={dofus.id}
                  dofus={dofus}
                  progress={progressMap.get(dofus.id) ?? null}
                />
              ))}
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}
