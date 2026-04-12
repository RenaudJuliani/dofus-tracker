import { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { getAchievementSubcategories } from "@dofus-tracker/db";
import { AchievementSubcategoryCard } from "@/components/achievements/AchievementCard";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";
import type { AchievementSubcategory } from "@dofus-tracker/types";

const TTL_5MIN = 1000 * 60 * 5;

export default function AchievementsScreen() {
  const router = useRouter();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const [subcategories, setSubcategories] = useState<AchievementSubcategory[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!activeCharacterId) return;

      async function load() {
        const cacheKey = CACHE_KEYS.achievementSubcategories(activeCharacterId!);
        const cached = await readCache<AchievementSubcategory[]>(cacheKey, TTL_5MIN);
        if (cached) {
          setSubcategories(cached);
          setLoading(false);
          return;
        }
        try {
          const data = await getAchievementSubcategories(supabase, activeCharacterId!);
          setSubcategories(data);
          await writeCache(cacheKey, data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }

      load();
    }, [activeCharacterId])
  );

  const totalPoints = subcategories.reduce((s, c) => s + c.earned_points, 0);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Succès" }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Succès</Text>
        <Text style={styles.headerPoints}>⭐ {totalPoints} pts</Text>
      </View>

      {loading ? (
        <Text style={styles.loading}>Chargement…</Text>
      ) : (
        <FlatList
          data={subcategories}
          keyExtractor={(item) => String(item.subcategory_id)}
          renderItem={({ item }) => (
            <AchievementSubcategoryCard
              subcategory={item}
              onPress={() =>
                router.push(
                  `/achievements/${item.subcategory_id}?name=${encodeURIComponent(item.subcategory_name)}`
                )
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080e0a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: { color: "#f59e0b", fontSize: 18, fontWeight: "700" },
  headerPoints: {
    color: "#92400e",
    backgroundColor: "#451a03",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 13,
    fontWeight: "700",
  },
  loading: { color: "#64748b", textAlign: "center", marginTop: 40 },
});
