import { useEffect, useState, useRef, useCallback } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import type { BottomSheetHandle } from "@/components/shared/CustomBottomSheet";
import {
  getDofusList,
  getDofusBySlug,
  getQuestsForDofus,
  toggleQuestCompletion,
} from "@dofus-tracker/db";
import { useQuestToggle } from "@dofus-tracker/ui";
import { DofusHeader } from "@/components/dofus/DofusHeader";
import { QuestSection } from "@/components/dofus/QuestSection";
import { ResourceSection } from "@/components/dofus/ResourceSection";
import { ResourceBottomSheet } from "@/components/resources/ResourceBottomSheet";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/cache";
import { addToQueue } from "@/lib/offlineQueue";
import { useToast } from "@/lib/ToastContext";
import type {
  Dofus,
  QuestWithChain,
  AggregatedResource,
  QuestSection as QuestSectionType,
} from "@dofus-tracker/types";

function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError ||
    (err instanceof Error && err.message.toLowerCase().includes("network"))
  );
}

export default function DofusDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const bottomSheetRef = useRef<BottomSheetHandle>(null);
  const { top } = useSafeAreaInsets();
  const { show } = useToast();

  const [dofus, setDofus] = useState<Dofus | null>(null);
  const [allDofus, setAllDofus] = useState<Dofus[]>([]);
  const [quests, setQuests] = useState<QuestWithChain[]>([]);
  const [loading, setLoading] = useState(true);

  const { handleBulkComplete } = useQuestToggle({
    supabase,
    characterId: activeCharacterId,
    dofusId: dofus?.id ?? "",
    setQuests,
  });

  // Wrapper qui intercepte les erreurs réseau avant le rollback de useQuestToggle
  const offlineHandleToggle = useCallback(
    async (questId: string, completed: boolean) => {
      if (!activeCharacterId || !dofus) return;
      // Optimistic update
      setQuests((prev) =>
        prev.map((q) => (q.id === questId ? { ...q, is_completed: completed } : q))
      );
      try {
        await toggleQuestCompletion(supabase, activeCharacterId, questId, completed);
        // Mettre à jour le cache des quêtes
        setQuests((current) => {
          writeCache(CACHE_KEYS.dofusQuests(slug ?? ""), current);
          return current;
        });
      } catch (err) {
        if (isNetworkError(err)) {
          // Garder l'état optimiste + mettre en queue
          await addToQueue({
            questId,
            characterId: activeCharacterId,
            dofusId: dofus.id,
            completed,
          });
          show("Mode hors-ligne — action mise en attente");
        } else {
          // Rollback pour les erreurs non-réseau
          setQuests((prev) =>
            prev.map((q) => (q.id === questId ? { ...q, is_completed: !completed } : q))
          );
        }
      }
    },
    [activeCharacterId, dofus, slug, show]
  );

  const loadData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const [foundDofus, allD] = await Promise.all([
        getDofusBySlug(supabase, slug),
        getDofusList(supabase),
      ]);
      setDofus(foundDofus);
      setAllDofus(allD);
      if (foundDofus) await writeCache(CACHE_KEYS.dofusBySlug(slug), foundDofus);

      if (foundDofus && activeCharacterId) {
        const q = await getQuestsForDofus(supabase, foundDofus.id, activeCharacterId);
        setQuests(q);
        await writeCache(CACHE_KEYS.dofusQuests(slug), q);
      }
    } catch {
      // Fallback cache
      const [cachedDofus, cachedQuests] = await Promise.all([
        readCache<Dofus>(CACHE_KEYS.dofusBySlug(slug)),
        readCache<QuestWithChain[]>(CACHE_KEYS.dofusQuests(slug)),
      ]);
      if (cachedDofus) setDofus(cachedDofus);
      if (cachedQuests) setQuests(cachedQuests);
      if (cachedDofus || cachedQuests) {
        show("Mode hors-ligne — données locales");
      } else {
        show("Erreur de chargement");
      }
    }
    setLoading(false);
  }, [slug, activeCharacterId, show]);

  useEffect(() => { loadData(); }, [loadData]);

  const prerequisites = quests.filter((q) => q.chain.section === "prerequisite");
  const mainQuests = quests.filter((q) => q.chain.section === "main");
  const completedCount = quests.filter((q) => q.is_completed).length;

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
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingTop: top + 16 }}>
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
            onToggle={offlineHandleToggle}
            onBulkComplete={() => handleBulkComplete("prerequisite" as QuestSectionType)}
          />
        )}
        {mainQuestGroups.map(({ title, quests: groupQuests }) => (
          <QuestSection
            key={title}
            title={title}
            quests={groupQuests}
            dofusColor={dofus.color}
            onToggle={offlineHandleToggle}
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
