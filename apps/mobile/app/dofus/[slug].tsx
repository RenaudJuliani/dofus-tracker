import { useEffect, useState, useRef, useCallback } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import type { BottomSheetHandle } from "@/components/shared/CustomBottomSheet";
import {
  getDofusList,
  getDofusBySlug,
  getQuestsForDofus,
} from "@dofus-tracker/db";
import { useQuestToggle } from "@dofus-tracker/ui";
import { DofusHeader } from "@/components/dofus/DofusHeader";
import { QuestSection } from "@/components/dofus/QuestSection";
import { ResourceSection } from "@/components/dofus/ResourceSection";
import { ResourceBottomSheet } from "@/components/resources/ResourceBottomSheet";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import type {
  Dofus,
  QuestWithChain,
  AggregatedResource,
  QuestSection as QuestSectionType,
} from "@dofus-tracker/types";

export default function DofusDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const bottomSheetRef = useRef<BottomSheetHandle>(null);

  const [dofus, setDofus] = useState<Dofus | null>(null);
  const [allDofus, setAllDofus] = useState<Dofus[]>([]);
  const [quests, setQuests] = useState<QuestWithChain[]>([]);
  const [loading, setLoading] = useState(true);

  const { handleToggle, handleBulkComplete } = useQuestToggle({
    supabase,
    characterId: activeCharacterId,
    dofusId: dofus?.id ?? "",
    setQuests,
  });

  const loadData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    const [foundDofus, allD] = await Promise.all([
      getDofusBySlug(supabase, slug),
      getDofusList(supabase),
    ]);
    setDofus(foundDofus);
    setAllDofus(allD);

    if (foundDofus && activeCharacterId) {
      const q = await getQuestsForDofus(supabase, foundDofus.id, activeCharacterId);
      setQuests(q);
    }
    setLoading(false);
  }, [slug, activeCharacterId]);

  useEffect(() => { loadData(); }, [loadData]);

  const prerequisites = quests.filter((q) => q.chain.section === "prerequisite");
  const mainQuests = quests.filter((q) => q.chain.section === "main");
  const completedCount = quests.filter((q) => q.is_completed).length;

  // Aggregate resources from all quests (sum by name)
  const aggregatedResources: AggregatedResource[] = Object.values(
    quests.reduce(
      (acc, quest) => {
        for (const r of quest.resources) {
          const existing = acc[r.name];
          acc[r.name] = {
            name: r.name,
            quantity: (existing?.quantity ?? 0) + r.quantity,
            is_kamas: r.is_kamas,
          };
        }
        return acc;
      },
      {} as Record<string, AggregatedResource>
    )
  );

  // Group main quests by sub_section, preserving order of first appearance
  const mainQuestGroups: Array<{ title: string; quests: typeof mainQuests }> = [];
  for (const quest of mainQuests) {
    const title = quest.chain.sub_section ?? "Les quêtes";
    const existing = mainQuestGroups.find((g) => g.title === title);
    if (existing) existing.quests.push(quest);
    else mainQuestGroups.push({ title, quests: [quest] });
  }

  if (loading || !dofus) {
    return (
      <View className="flex-1 bg-dofus-dark items-center justify-center">
        <ActivityIndicator color="#4ade80" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-dofus-dark">
      <Stack.Screen options={{ title: dofus.name, headerBackTitle: "Mes Dofus" }} />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <DofusHeader
          dofus={dofus}
          allDofus={allDofus}
          quests={quests}
          completedCount={completedCount}
        />
        {prerequisites.length > 0 && (
          <QuestSection
            title="Prérequis"
            quests={prerequisites}
            dofusColor={dofus.color}
            onToggle={handleToggle}
            onBulkComplete={() => handleBulkComplete("prerequisite" as QuestSectionType)}
          />
        )}
        {mainQuestGroups.map(({ title, quests: groupQuests }) => (
          <QuestSection
            key={title}
            title={title}
            quests={groupQuests}
            dofusColor={dofus.color}
            onToggle={handleToggle}
            onBulkComplete={() => handleBulkComplete("main" as QuestSectionType)}
          />
        ))}
        {aggregatedResources.length > 0 && (
          <ResourceSection
            resources={aggregatedResources}
            onOpenSheet={() => bottomSheetRef.current?.expand()}
          />
        )}
      </ScrollView>

      <ResourceBottomSheet
        ref={bottomSheetRef}
        resources={aggregatedResources}
        dofusColor={dofus.color}
      />
    </View>
  );
}
