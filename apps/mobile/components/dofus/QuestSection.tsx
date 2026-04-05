import { View, Text, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import { QuestItem } from "./QuestItem";
import { QuestGroupBox } from "@/components/shared/QuestGroupBox";
import type { QuestWithChain } from "@dofus-tracker/types";
import type { ReactNode } from "react";

interface Props {
  title: string;
  quests: QuestWithChain[];
  dofusColor: string;
  onToggle: (questId: string, completed: boolean) => void;
  onBulkComplete: () => void;
}

export function QuestSection({ title, quests, dofusColor, onToggle, onBulkComplete }: Props) {
  const rendered: ReactNode[] = [];
  const seen = new Set<string>();

  for (const quest of quests) {
    const gid = quest.chain.group_id;
    if (gid && !seen.has(gid)) {
      seen.add(gid);
      const group = quests.filter((q) => q.chain.group_id === gid);
      rendered.push(
        <QuestGroupBox key={gid}>
          {group.map((q) => (
            <QuestItem key={q.id} quest={q} dofusColor={dofusColor} onToggle={onToggle} />
          ))}
        </QuestGroupBox>
      );
    } else if (!gid) {
      rendered.push(
        <QuestItem key={quest.id} quest={quest} dofusColor={dofusColor} onToggle={onToggle} />
      );
    }
  }

  return (
    <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden mb-4">
      <View className="p-4" style={{ backgroundColor: "rgba(8,16,10,0.55)" }}>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-bold text-white">{title}</Text>
          <TouchableOpacity
            onPress={onBulkComplete}
            className="px-3 py-1 rounded-lg bg-white/5 border border-white/10"
          >
            <Text className="text-xs text-gray-400">Tout cocher</Text>
          </TouchableOpacity>
        </View>
        {rendered}
      </View>
    </BlurView>
  );
}
