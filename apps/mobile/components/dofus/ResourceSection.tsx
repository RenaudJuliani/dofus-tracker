import { View, Text, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import type { AggregatedResource } from "@dofus-tracker/types";

interface Props {
  resources: AggregatedResource[];
  onOpenSheet: () => void;
}

export function ResourceSection({ resources, onOpenSheet }: Props) {
  return (
    <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden mb-8">
      <View className="p-4" style={{ backgroundColor: "rgba(8,16,10,0.55)" }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-white">
            Ressources ({resources.length})
          </Text>
          <TouchableOpacity
            onPress={onOpenSheet}
            className="bg-dofus-green/20 border border-dofus-green/40 px-3 py-1.5 rounded-xl"
          >
            <Text className="text-dofus-green text-sm font-semibold">Voir tout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BlurView>
  );
}
