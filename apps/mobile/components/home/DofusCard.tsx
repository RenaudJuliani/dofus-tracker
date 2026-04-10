import { TouchableOpacity, View, Text } from "react-native";
import { router } from "expo-router";
import { BlurView } from "expo-blur";
import { EggImage } from "@/components/shared/EggImage";
import { ProgressBar } from "@/components/shared/ProgressBar";
import type { Dofus, DofusProgress } from "@dofus-tracker/types";

interface Props {
  dofus: Dofus;
  progress: DofusProgress | null;
  loading?: boolean;
}

export function DofusCard({ dofus, progress, loading }: Props) {
  const pct = Math.min(100, progress?.progress_pct ?? 0);
  const completed = progress?.completed_quests ?? 0;
  const total = progress?.total_quests ?? 0;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/dofus/${dofus.slug}`)}
      className="flex-1 m-2"
      activeOpacity={0.8}
    >
      <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden flex-1">
        <View
          className="p-4 flex-1"
          style={{ backgroundColor: "rgba(8,16,10,0.55)" }}
        >
          <View className="items-center mb-3">
            <EggImage imageUrl={dofus.image_url} color={dofus.color} size={64} />
          </View>

          <Text className="text-white font-bold text-center text-sm leading-tight mb-0.5">
            {dofus.name}
          </Text>
          <Text className="text-gray-400 text-xs text-center capitalize mb-3">
            {dofus.type}
          </Text>

          <View className="mt-auto">
            {loading ? (
              <View className="space-y-1.5">
                <View className="h-2.5 rounded bg-white/10 w-3/4" />
                <View className="h-1.5 rounded bg-white/10" />
              </View>
            ) : (
              <>
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-xs text-gray-400">{completed}/{total}</Text>
                  <Text className="text-xs font-bold" style={{ color: dofus.color }}>
                    {pct}%
                  </Text>
                </View>
                <ProgressBar pct={pct} color={dofus.color} />
              </>
            )}
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}
