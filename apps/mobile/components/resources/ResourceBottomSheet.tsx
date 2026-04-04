import { forwardRef, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { CustomBottomSheet as BottomSheet, BottomSheetView, type BottomSheetHandle } from "@/components/shared/CustomBottomSheet";
import { useResources } from "@dofus-tracker/ui";
import type { AggregatedResource } from "@dofus-tracker/types";

interface Props {
  resources: AggregatedResource[];
  dofusColor: string;
}

const PRESETS = [1, 2, 3, 4, 5];

function formatNumber(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

export const ResourceBottomSheet = forwardRef<BottomSheetHandle, Props>(
  function ResourceBottomSheet({ resources, dofusColor }, ref) {
    const { multiplier, setMultiplier, items, kamas, getQuantity } = useResources(resources);

    const renderItem = useCallback(
      ({ item }: { item: AggregatedResource }) => (
        <View className="flex-row items-center gap-3 px-5 py-2.5 border-b border-white/5">
          <Text className="text-sm text-white flex-1">{item.name}</Text>
          <Text className="text-sm font-bold" style={{ color: dofusColor }}>
            {formatNumber(getQuantity(item))}
          </Text>
        </View>
      ),
      [dofusColor, getQuantity]
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["45%", "90%"]}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#0d1f12" }}
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.2)" }}
      >
        <BottomSheetView>
          <Text className="px-5 py-3 text-base font-bold text-white border-b border-white/5">
            Ressources nécessaires
          </Text>

          <View className="flex-row gap-2 px-5 py-3 border-b border-white/5">
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setMultiplier(p)}
                className="flex-1 py-1.5 rounded-lg items-center"
                style={{
                  backgroundColor:
                    multiplier === p ? dofusColor : "rgba(255,255,255,0.05)",
                }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: multiplier === p ? "#000" : "#9ca3af" }}
                >
                  ×{p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={items}
            keyExtractor={(r) => r.name}
            renderItem={renderItem}
            scrollEnabled={true}
            style={{ maxHeight: 300 }}
          />

          {kamas.map((k) => (
            <View key={k.name} className="flex-row items-center gap-3 px-5 py-3 bg-yellow-500/5 border-t border-white/5">
              <Text className="text-sm text-white flex-1">{k.name}</Text>
              <Text className="text-sm font-bold text-yellow-400">
                {formatNumber(getQuantity(k))}
              </Text>
            </View>
          ))}

          <Text className="text-xs text-gray-500 text-center py-3">
            {items.length} type{items.length > 1 ? "s" : ""} de ressources
            {multiplier > 1 ? ` · ×${multiplier} personnages` : ""}
          </Text>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
