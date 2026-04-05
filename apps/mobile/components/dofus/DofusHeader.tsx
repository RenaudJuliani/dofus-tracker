import { View, Text } from "react-native";
import { BlurView } from "expo-blur";
import { EggImage } from "@/components/shared/EggImage";
import { ProgressBar } from "@/components/shared/ProgressBar";
import type { Dofus, QuestWithChain } from "@dofus-tracker/types";

interface Props {
  dofus: Dofus;
  allDofus: Dofus[];
  quests: QuestWithChain[];
  completedCount: number;
}

export function DofusHeader({ dofus, quests, completedCount }: Props) {
  const total = quests.length;
  const remaining = total - completedCount;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden mb-4">
      <View className="p-5" style={{ backgroundColor: "rgba(8,16,10,0.55)" }}>
        <View className="flex-row items-start gap-4 mb-4">
          <EggImage imageUrl={dofus.image_url} color={dofus.color} size={80} />
          <View className="flex-1">
            <Text className="text-2xl font-black text-white leading-tight">{dofus.name}</Text>
            <Text className="text-xs text-gray-400 capitalize mt-0.5">{dofus.type}</Text>
            {dofus.description ? (
              <Text className="text-sm text-gray-300 mt-2 leading-relaxed">{dofus.description}</Text>
            ) : null}
          </View>
        </View>

        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-dofus-green text-sm font-semibold">{completedCount} complétées</Text>
          <Text className="text-gray-400 text-sm">{remaining} restantes</Text>
          <Text className="text-xl font-extrabold" style={{ color: dofus.color }}>{pct}%</Text>
        </View>
        <ProgressBar pct={pct} color={dofus.color} />
      </View>
    </BlurView>
  );
}
