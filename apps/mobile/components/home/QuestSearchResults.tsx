import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { router } from "expo-router";
import { EggImage } from "@/components/shared/EggImage";
import type { QuestSearchResult } from "@dofus-tracker/types";

interface Props {
  results: QuestSearchResult[];
  query: string;
  loading: boolean;
}

export function QuestSearchResults({ results, query, loading }: Props) {
  if (loading) {
    return (
      <View className="px-4 py-6">
        <Text className="text-gray-400 text-sm">Recherche…</Text>
      </View>
    );
  }

  if (results.length === 0) {
    return (
      <View className="px-4 py-6">
        <Text className="text-gray-500 text-sm">Aucune quête trouvée pour « {query} »</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(r) => `${r.quest_id}-${r.dofus_id}`}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      ListHeaderComponent={
        <Text className="text-xs text-gray-500 mb-2">
          {results.length} résultat{results.length > 1 ? "s" : ""}
        </Text>
      }
      renderItem={({ item: r }) => (
        <TouchableOpacity
          onPress={() => router.push(`/dofus/${r.dofus_slug}?highlight=${r.quest_slug}` as never)}
          className="flex-row items-center gap-3 px-4 py-3 rounded-xl border border-white/5"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
          activeOpacity={0.7}
        >
          <View className="w-8 h-8 shrink-0">
            <EggImage imageUrl={r.dofus_image_url} color={r.dofus_color} size={32} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-white" numberOfLines={1}>
              {r.quest_name}
            </Text>
            <Text className="text-xs text-gray-500" numberOfLines={1}>
              {r.dofus_name}{r.sub_section ? ` · ${r.sub_section}` : ""}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}
