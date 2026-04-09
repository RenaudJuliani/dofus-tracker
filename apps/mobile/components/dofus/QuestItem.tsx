import { useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { QuestTypeBadge } from "@/components/shared/QuestTypeBadge";
import type { QuestWithChain } from "@dofus-tracker/types";

interface Props {
  quest: QuestWithChain;
  dofusColor: string;
  onToggle: (questId: string, completed: boolean) => void;
}

export function QuestItem({ quest, dofusColor, onToggle }: Props) {
  const { chain, is_completed, shared_dofus_ids, resources } = quest;
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const hasResources = resources.length > 0;

  function handlePress() {
    if (quest.dofuspourlesnoobs_url) {
      Linking.openURL(quest.dofuspourlesnoobs_url);
    }
  }

  return (
    <View
      className="rounded-xl mb-1 overflow-hidden"
      style={{
        backgroundColor: is_completed ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
      }}
    >
      {/* Main row */}
      <View className="flex-row items-start gap-3 px-3 py-2.5">
        {/* Checkbox */}
        <Pressable
          onPress={() => onToggle(quest.id, !is_completed)}
          className="mt-0.5"
          hitSlop={8}
        >
          <View
            className="w-4 h-4 rounded border items-center justify-center"
            style={{
              borderColor: is_completed ? "#4ade80" : "rgba(255,255,255,0.2)",
              backgroundColor: is_completed ? "#4ade80" : "transparent",
            }}
          >
            {is_completed && <Text className="text-black text-xs font-bold leading-none">✓</Text>}
          </View>
        </Pressable>

        {/* Quest info */}
        <View className="flex-1 min-w-0 gap-1.5">
          <View className="flex-row items-center flex-wrap gap-2">
            <Pressable onPress={handlePress}>
              <Text
                className={`text-sm font-medium ${is_completed ? "line-through text-gray-500" : "text-white"}`}
              >
                {quest.name}
              </Text>
            </Pressable>
            {shared_dofus_ids.length > 0 && (
              <View
                className="rounded-md px-1.5 py-0.5"
                style={{ backgroundColor: "#3b82f622", borderColor: "#3b82f644", borderWidth: 1 }}
              >
                <Text className="text-xs font-medium text-blue-400">
                  ×{shared_dofus_ids.length + 1}
                </Text>
              </View>
            )}
          </View>

          {chain.note && !chain.group_id && (
            <View className="bg-cyan-400/5 border border-cyan-400/20 rounded-lg px-2 py-1.5">
              <Text className="text-xs text-cyan-400/80">{chain.note}</Text>
            </View>
          )}

          <View className="flex-row flex-wrap gap-1.5">
            {chain.quest_types.map((type) => (
              <QuestTypeBadge key={type} type={type} combatCount={chain.combat_count} />
            ))}
            {chain.is_avoidable && (
              <View className="bg-white/5 border border-white/10 rounded-md px-2 py-0.5">
                <Text className="text-xs text-gray-400">Évitable</Text>
              </View>
            )}
          </View>
        </View>

        {/* Right side: order + resources toggle */}
        <View className="items-end gap-1 shrink-0 mt-0.5">
          <Text className="text-xs text-gray-600">#{chain.order_index}</Text>
          {hasResources && (
            <Pressable
              onPress={() => setResourcesExpanded((v) => !v)}
              hitSlop={6}
              className="px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              <Text className="text-xs" style={{ color: dofusColor }}>
                {resourcesExpanded ? "▲" : `📦 ${resources.length}`}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Expandable resources */}
      {resourcesExpanded && (
        <View className="border-t border-white/5 px-3 py-2 gap-1">
          {resources.map((r) => (
            <View key={r.id} className="flex-row justify-between items-center">
              <Text className="text-xs text-gray-400">{r.name}</Text>
              <Text className="text-xs font-semibold" style={{ color: dofusColor }}>
                ×{r.quantity}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
