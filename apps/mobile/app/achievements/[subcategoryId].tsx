import { useState, useCallback, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  getAchievementsForCharacter,
  getAchievementSubcategories,
  toggleObjectiveCompletion,
} from "@dofus-tracker/db";
import {
  AchievementBottomSheet,
  type AchievementBottomSheetHandle,
} from "@/components/achievements/AchievementBottomSheet";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";
import type { AchievementWithProgress } from "@dofus-tracker/types";

const TTL_5MIN = 1000 * 60 * 5;

function statusColor(completed: number, total: number) {
  if (total === 0) return "#334155";
  if (completed === total) return "#22c55e";
  if (completed > 0) return "#f59e0b";
  return "#334155";
}

export default function AchievementListScreen() {
  const { subcategoryId, name } = useLocalSearchParams<{ subcategoryId: string; name: string }>();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithProgress | null>(null);
  const bottomSheetRef = useRef<AchievementBottomSheetHandle>(null);

  useFocusEffect(
    useCallback(() => {
      if (!activeCharacterId || !subcategoryId) {
        setLoading(false);
        return;
      }
      const catId = parseInt(subcategoryId, 10);
      const cacheKey = CACHE_KEYS.achievements(catId, activeCharacterId);

      async function load() {
        const cached = await readCache<AchievementWithProgress[]>(cacheKey, TTL_5MIN);
        if (cached) {
          setAchievements(cached);
          setLoading(false);
          return;
        }
        try {
          const data = await getAchievementsForCharacter(supabase, catId, activeCharacterId!);
          setAchievements(data);
          await writeCache(cacheKey, data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }

      load();
    }, [activeCharacterId, subcategoryId])
  );

  async function handleToggleObjective(objectiveId: string, questId: string | null, completed: boolean) {
    if (!activeCharacterId) return;

    // Capture state for rollback
    const prevAchievements = achievements;
    const prevSelected = selectedAchievement;

    // Optimistic update
    const updateAchs = (prev: AchievementWithProgress[]) =>
      prev.map((a) => ({
        ...a,
        objectives: a.objectives.map((o) =>
          o.id === objectiveId
            ? { ...o, is_completed: completed, completion_source: completed ? ("manual" as const) : null }
            : o
        ),
        completed_count: a.objectives.filter((o) => (o.id === objectiveId ? completed : o.is_completed)).length,
      }));

    const updatedAchs = updateAchs(achievements);
    setAchievements(updatedAchs);
    setSelectedAchievement((prev) => prev ? updateAchs([prev])[0] : null);

    try {
      await toggleObjectiveCompletion(supabase, activeCharacterId, objectiveId, questId, completed);
      // Mettre à jour le cache des achievements pour cette sous-catégorie
      const catId = parseInt(subcategoryId, 10);
      await writeCache(CACHE_KEYS.achievements(catId, activeCharacterId), updatedAchs);
      // Invalider le cache des sous-catégories
      const subcats = await getAchievementSubcategories(supabase, activeCharacterId);
      await writeCache(CACHE_KEYS.achievementSubcategories(activeCharacterId), subcats);
    } catch (err) {
      console.error(err);
      // Rollback
      setAchievements(prevAchievements);
      setSelectedAchievement(prevSelected);
    }
  }

  const filtered = search
    ? achievements.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : achievements;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: decodeURIComponent(name ?? "Succès") }} />

      {/* Barre de recherche */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher…"
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <Text style={styles.loading}>Chargement…</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                setSelectedAchievement(item);
                bottomSheetRef.current?.expand();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.colorBar, { backgroundColor: statusColor(item.completed_count, item.total_count) }]} />
              <View style={styles.rowIcon}>
                <Text style={{ fontSize: 16 }}>🏆</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                <Text style={[
                  styles.rowProgress,
                  item.completed_count === item.total_count ? styles.progressDone : item.completed_count > 0 ? styles.progressPartial : styles.progressTodo
                ]}>
                  {item.completed_count}/{item.total_count} objectifs
                </Text>
              </View>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsText}>{item.points}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <AchievementBottomSheet
        ref={bottomSheetRef}
        achievement={selectedAchievement}
        onToggleObjective={handleToggleObjective}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080e0a" },
  searchWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  searchInput: {
    backgroundColor: "#1e1e35",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#e2e8f0",
    fontSize: 14,
  },
  loading: { color: "#64748b", textAlign: "center", marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
    gap: 10,
  },
  colorBar: { width: 3, alignSelf: "stretch", borderRadius: 2 },
  rowIcon: {
    width: 32,
    height: 32,
    backgroundColor: "#1e1e35",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { color: "#e2e8f0", fontSize: 13, fontWeight: "600", marginBottom: 2 },
  rowProgress: { fontSize: 11 },
  progressDone: { color: "#22c55e" },
  progressPartial: { color: "#f59e0b" },
  progressTodo: { color: "#475569" },
  pointsBadge: { backgroundColor: "#1e293b", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pointsText: { color: "#f59e0b", fontWeight: "700", fontSize: 12 },
});
