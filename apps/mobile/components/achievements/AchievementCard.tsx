import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { AchievementSubcategory } from "@dofus-tracker/types";

interface Props {
  subcategory: AchievementSubcategory;
  onPress: () => void;
}

export function AchievementSubcategoryCard({ subcategory, onPress }: Props) {
  const progress =
    subcategory.total_achievements > 0
      ? subcategory.completed_achievements / subcategory.total_achievements
      : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {subcategory.subcategory_name}
        </Text>
        <View style={styles.progressWrap}>
          <View style={[styles.progressBar, { width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.count}>
          {subcategory.completed_achievements}/{subcategory.total_achievements}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  info: { flex: 1, marginRight: 12 },
  name: { color: "#e2e8f0", fontSize: 14, marginBottom: 4 },
  progressWrap: {
    height: 3,
    backgroundColor: "#1e293b",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#f59e0b",
    borderRadius: 2,
  },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  count: {
    fontSize: 12,
    color: "#64748b",
    backgroundColor: "#1e293b",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  chevron: { color: "#475569", fontSize: 16 },
});
