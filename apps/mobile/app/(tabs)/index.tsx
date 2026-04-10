import { useState, useCallback, useEffect } from "react";
import { View, Text, TextInput } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { getDofusList, getDofusProgressForCharacter, getCharacters, getQuestsForDofus, searchQuests } from "@dofus-tracker/db";
import { DofusGrid } from "@/components/home/DofusGrid";
import { QuestSearchResults } from "@/components/home/QuestSearchResults";
import { CharacterSelector } from "@/components/shared/CharacterSelector";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";
import { useToast } from "@/lib/ToastContext";
import type { Dofus, DofusProgress, Character, QuestSearchResult } from "@dofus-tracker/types";

const TTL_24H = 1000 * 60 * 60 * 24;

export default function MesDofusScreen() {
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const [dofusList, setDofusList] = useState<Dofus[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, DofusProgress>>(new Map());
  const [characters, setCharacters] = useState<Character[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<QuestSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const { show } = useToast();

  const preCacheQuests = useCallback(async (dofus: Dofus[], characterId: string) => {
    for (const d of dofus) {
      const cached = await readCache(CACHE_KEYS.dofusQuests(d.slug));
      if (!cached) {
        try {
          const quests = await getQuestsForDofus(supabase, d.id, characterId);
          await writeCache(CACHE_KEYS.dofusQuests(d.slug), quests);
        } catch {
          // Silencieux — best effort
        }
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRefreshing(false); return; }

    try {
      const [allDofus, allChars] = await Promise.all([
        getDofusList(supabase),
        getCharacters(supabase, user.id),
      ]);
      setDofusList(allDofus);
      setCharacters(allChars);
      await writeCache(CACHE_KEYS.dofusList, allDofus);

      if (activeCharacterId) {
        const progress = await getDofusProgressForCharacter(supabase, activeCharacterId);
        const map = new Map(progress.map((p) => [p.dofus_id, p]));
        setProgressMap(map);
        await writeCache(CACHE_KEYS.dofusProgress(activeCharacterId), progress);
        // Pre-cache en background — ne pas await
        preCacheQuests(allDofus, activeCharacterId);
      }
    } catch {
      // Fallback cache
      const cachedDofus = await readCache<Dofus[]>(CACHE_KEYS.dofusList, TTL_24H);
      if (cachedDofus) {
        setDofusList(cachedDofus);
        show("Mode hors-ligne — données locales");
      }
      if (activeCharacterId) {
        const cachedProgress = await readCache<DofusProgress[]>(CACHE_KEYS.dofusProgress(activeCharacterId));
        if (cachedProgress) {
          setProgressMap(new Map(cachedProgress.map((p) => [p.dofus_id, p])));
        }
      }
      if (!await readCache<Dofus[]>(CACHE_KEYS.dofusList, TTL_24H)) {
        show("Erreur de chargement");
      }
    }
    setRefreshing(false);
  }, [activeCharacterId, show, preCacheQuests]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchQuests(supabase, debouncedQuery)
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQuery]);

  return (
    <View className="flex-1 bg-dofus-dark">
      <Stack.Screen
        options={{
          title: "Mes Dofus",
          headerRight: () => <CharacterSelector characters={characters} />,
        }}
      />
      {/* Search bar */}
      <View className="mx-4 mt-3 mb-1 flex-row items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2">
        <Text className="text-gray-500 mr-2">🔍</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une quête…"
          placeholderTextColor="#6b7280"
          className="flex-1 text-sm text-white"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {query.length >= 2 ? (
        <QuestSearchResults results={searchResults} query={debouncedQuery} loading={searching} />
      ) : dofusList.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Chargement…</Text>
        </View>
      ) : (
        <DofusGrid
          dofusList={dofusList.filter(
            (d) => progressMap.size === 0 || (progressMap.get(d.id)?.total_quests ?? 0) > 0
          )}
          progressMap={progressMap}
          refreshing={refreshing}
          onRefresh={loadData}
        />
      )}
    </View>
  );
}
