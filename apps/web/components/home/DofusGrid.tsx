"use client";

import { useEffect, useState, useCallback } from "react";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { useSupabase } from "@/app/providers";
import { getDofusProgressForCharacter, searchQuests } from "@dofus-tracker/db";
import { DofusCard } from "./DofusCard";
import { QuestSearchResults } from "./QuestSearchResults";
import type { Dofus, DofusProgress, QuestSearchResult } from "@dofus-tracker/types";

interface Props {
  dofusList: Dofus[];
}

export function DofusGrid({ dofusList }: Props) {
  const supabase = useSupabase();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const [progressMap, setProgressMap] = useState<Map<string, DofusProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(() => useCharacterStore.persist.hasHydrated());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<QuestSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Wait for Zustand to rehydrate from localStorage before fetching progress.
  // Without this, activeCharacterId is null on the first render even when a
  // character is stored — causing the cards to flash "0 / 0 quêtes".
  useEffect(() => {
    if (hydrated) return;
    return useCharacterStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  const loadProgress = useCallback(async () => {
    if (!activeCharacterId) {
      setProgressMap(new Map());
      setLoading(false);
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
    if (hydrated) loadProgress();
  }, [loadProgress, hydrated]);

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch search results
  useEffect(() => {
    if (debouncedQuery.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchQuests(supabase, debouncedQuery)
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQuery, supabase]);

  const showSearch = query.length >= 2;
  const primordial = dofusList.filter((d) => d.type === "primordial");
  const secondaire = dofusList.filter((d) => d.type === "secondaire");

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une quête…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-dofus-green/40 transition-colors"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {showSearch ? (
        <QuestSearchResults results={searchResults} query={debouncedQuery} loading={searching} />
      ) : (
        <div className="space-y-10">
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
                      loading={loading}
                    />
                  ))}
                </div>
              </section>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
