import { FlatList, RefreshControl } from "react-native";
import { DofusCard } from "./DofusCard";
import type { Dofus, DofusProgress } from "@dofus-tracker/types";

interface Props {
  dofusList: Dofus[];
  progressMap: Map<string, DofusProgress>;
  refreshing: boolean;
  onRefresh: () => void;
}

export function DofusGrid({ dofusList, progressMap, refreshing, onRefresh }: Props) {
  return (
    <FlatList
      data={dofusList}
      keyExtractor={(d) => d.id}
      numColumns={2}
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
