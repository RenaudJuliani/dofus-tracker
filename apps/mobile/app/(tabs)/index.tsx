import { useState, useCallback } from "react";
import { View, Text } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { getDofusList, getDofusProgressForCharacter, getCharacters } from "@dofus-tracker/db";
import { DofusGrid } from "@/components/home/DofusGrid";
import { CharacterSelector } from "@/components/shared/CharacterSelector";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import type { Dofus, DofusProgress, Character } from "@dofus-tracker/types";

export default function MesDofusScreen() {
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const [dofusList, setDofusList] = useState<Dofus[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, DofusProgress>>(new Map());
  const [characters, setCharacters] = useState<Character[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRefreshing(false); return; }

    const [allDofus, allChars] = await Promise.all([
      getDofusList(supabase),
      getCharacters(supabase, user.id),
    ]);
    setDofusList(allDofus);
    setCharacters(allChars);

    if (activeCharacterId) {
      const progress = await getDofusProgressForCharacter(supabase, activeCharacterId);
      const map = new Map(progress.map((p) => [p.dofus_id, p]));
      setProgressMap(map);
    }
    setRefreshing(false);
  }, [activeCharacterId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  return (
    <View className="flex-1 bg-dofus-dark">
      <Stack.Screen
        options={{
          title: "Mes Dofus",
          headerRight: () => <CharacterSelector characters={characters} />,
        }}
      />
      {dofusList.length === 0 ? (
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
