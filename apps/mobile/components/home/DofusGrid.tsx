import { FlatList, RefreshControl, View, Text } from "react-native";
import { DofusCard } from "./DofusCard";
import { ProgressBar } from "@/components/shared/ProgressBar";
import type { Dofus, DofusProgress } from "@dofus-tracker/types";

interface Props {
  dofusList: Dofus[];
  progressMap: Map<string, DofusProgress>;
  refreshing: boolean;
  onRefresh: () => void;
}

function GlobalProgress({ dofusList, progressMap }: Pick<Props, "dofusList" | "progressMap">) {
  if (progressMap.size === 0) return null;

  const completed = dofusList.filter(
    (d) => (progressMap.get(d.id)?.progress_pct ?? 0) >= 100
  ).length;
  const total = dofusList.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <View className="mx-2 mb-2 px-4 py-3 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
      <View className="flex-row justify-between items-baseline mb-2">
        <Text className="text-sm font-semibold text-white">Avancée totale</Text>
        <Text className="text-xs text-gray-400">
          <Text className="text-dofus-green font-bold">{completed}</Text>
          {" / "}{total} Dofus terminés
        </Text>
      </View>
      <ProgressBar pct={pct} color="#4ade80" />
    </View>
  );
}

export function DofusGrid({ dofusList, progressMap, refreshing, onRefresh }: Props) {
  return (
    <FlatList
      data={dofusList}
      keyExtractor={(d) => d.id}
      numColumns={2}
      ListHeaderComponent={<GlobalProgress dofusList={dofusList} progressMap={progressMap} />}
      renderItem={({ item }) => (
        <DofusCard dofus={item} progress={progressMap.get(item.id) ?? null} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#4ade80"
        />
      }
      contentContainerStyle={{ padding: 8 }}
    />
  );
}
