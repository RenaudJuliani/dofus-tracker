import { useEffect, useState, useRef, useCallback } from "react";
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  Alignment,
  AlignmentOrder,
  JobVariant,
} from "@dofus-tracker/types";

const ALIGNMENT_LABELS: Record<Alignment, string> = {
  neutre: "Neutre",
  bontarien: "Bontarien",
  brakmarien: "Brakmarien",
};

const ORDER_LABELS: Record<AlignmentOrder, string> = {
  "coeur-vaillant": "Cœur Vaillant",
  "oeil-attentif": "Œil Attentif",
  "esprit-salvateur": "Esprit Salvateur",
  "coeur-saignant": "Cœur Saignant",
  "oeil-putride": "Œil Putride",
  "esprit-malsain": "Esprit Malsain",
};

const BONTA_ORDERS: AlignmentOrder[] = ["coeur-vaillant", "oeil-attentif", "esprit-salvateur"];
const BRAKMAR_ORDERS: AlignmentOrder[] = ["coeur-saignant", "oeil-putride", "esprit-malsain"];

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
  const [selectedAlignment, setSelectedAlignment] = useState<Alignment | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AlignmentOrder | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobVariant | null>(null);

  const { handleBulkComplete, handleBulkUncomplete } = useQuestToggle({
    supabase,
    characterId: activeCharacterId,
    dofusId: dofus?.id ?? "",
    setQuests,
  });

  // Load persisted alignment + job variant from AsyncStorage
  useEffect(() => {
    if (!activeCharacterId || !dofus) return;
    const key = `alignment_${dofus.id}_${activeCharacterId}`;
    const orderKey = `alignment_order_${dofus.id}_${activeCharacterId}`;
    const jobKey = `job_variant_${dofus.id}_${activeCharacterId}`;
    Promise.all([
      AsyncStorage.getItem(key),
      AsyncStorage.getItem(orderKey),
      AsyncStorage.getItem(jobKey),
    ]).then(([saved, savedOrder, savedJob]) => {
      setSelectedAlignment((saved as Alignment) ?? null);
      setSelectedOrder((savedOrder as AlignmentOrder) ?? null);
      setSelectedJob((savedJob as JobVariant) ?? null);
    });
  }, [dofus?.id, activeCharacterId]);

  async function handleAlignmentChange(alignment: Alignment | null) {
    if (!activeCharacterId || !dofus) return;
    setSelectedAlignment(alignment);
    setSelectedOrder(null);
    const key = `alignment_${dofus.id}_${activeCharacterId}`;
    const orderKey = `alignment_order_${dofus.id}_${activeCharacterId}`;
    if (alignment) await AsyncStorage.setItem(key, alignment);
    else await AsyncStorage.removeItem(key);
    await AsyncStorage.removeItem(orderKey);
  }

  async function handleOrderChange(order: AlignmentOrder | null) {
    if (!activeCharacterId || !dofus) return;
    setSelectedOrder(order);
    const orderKey = `alignment_order_${dofus.id}_${activeCharacterId}`;
    if (order) await AsyncStorage.setItem(orderKey, order);
    else await AsyncStorage.removeItem(orderKey);
  }

  async function handleJobChange(job: JobVariant | null) {
    if (!activeCharacterId || !dofus) return;
    setSelectedJob(job);
    const jobKey = `job_variant_${dofus.id}_${activeCharacterId}`;
    if (job) await AsyncStorage.setItem(jobKey, job);
    else await AsyncStorage.removeItem(jobKey);
  }

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

  // Alignment + job variant detection
  const alignments = [...new Set(quests.map((q) => q.chain.alignment).filter(Boolean))] as Alignment[];
  const hasAlignment = alignments.length > 0;
  const hasNeutre = alignments.includes("neutre");
  const hasJobVariant = quests.some((q) => q.chain.job_variant !== null);

  function isQuestVisible(q: QuestWithChain): boolean {
    // Job variant filter: hide job-specific quests if wrong/no job selected
    if (q.chain.job_variant !== null) {
      if (!selectedJob || q.chain.job_variant !== selectedJob) return false;
    }
    // Alignment filter
    if (!hasAlignment || !selectedAlignment) return true;
    const a = q.chain.alignment;
    if (a === null) return true;
    if (a !== selectedAlignment) return false;
    if (q.chain.alignment_order !== null) {
      return q.chain.alignment_order === selectedOrder;
    }
    return true;
  }

  const visibleQuests = quests.filter(isQuestVisible);
  const prerequisites = visibleQuests.filter((q) => q.chain.section === "prerequisite");
  const mainQuests = visibleQuests.filter((q) => q.chain.section === "main");
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

  // Group prerequisites by sub_section
  const prerequisiteGroups: Array<{ title: string; quests: typeof prerequisites }> = [];
  for (const quest of prerequisites) {
    const title = quest.chain.sub_section ?? "Prérequis";
    const existing = prerequisiteGroups.find((g) => g.title === title);
    if (existing) existing.quests.push(quest);
    else prerequisiteGroups.push({ title, quests: [quest] });
  }

  const mainQuestGroups: Array<{ title: string; quests: typeof mainQuests }> = [];
  for (const quest of mainQuests) {
    const title = quest.chain.sub_section ?? "Les quêtes";
    const existing = mainQuestGroups.find((g) => g.title === title);
    if (existing) existing.quests.push(quest);
    else mainQuestGroups.push({ title, quests: [quest] });
  }

  const availableOrders: AlignmentOrder[] =
    selectedAlignment === "bontarien" ? BONTA_ORDERS :
    selectedAlignment === "brakmarien" ? BRAKMAR_ORDERS : [];

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

        {hasAlignment && (
          <View className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4 gap-3">
            <Text className="text-sm font-medium text-gray-300">Alignement</Text>
            <View className="flex-row flex-wrap gap-2">
              {hasNeutre && (
                <TouchableOpacity
                  onPress={() => handleAlignmentChange(selectedAlignment === "neutre" ? null : "neutre")}
                  className={`px-3 py-1.5 rounded-full ${selectedAlignment === "neutre" ? "bg-gray-500" : "bg-white/10"}`}
                >
                  <Text className={`text-sm font-medium ${selectedAlignment === "neutre" ? "text-white" : "text-gray-400"}`}>
                    {ALIGNMENT_LABELS.neutre}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => handleAlignmentChange(selectedAlignment === "bontarien" ? null : "bontarien")}
                className={`px-3 py-1.5 rounded-full ${selectedAlignment === "bontarien" ? "bg-blue-600" : "bg-white/10"}`}
              >
                <Text className={`text-sm font-medium ${selectedAlignment === "bontarien" ? "text-white" : "text-gray-400"}`}>
                  {ALIGNMENT_LABELS.bontarien}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAlignmentChange(selectedAlignment === "brakmarien" ? null : "brakmarien")}
                className={`px-3 py-1.5 rounded-full ${selectedAlignment === "brakmarien" ? "bg-red-700" : "bg-white/10"}`}
              >
                <Text className={`text-sm font-medium ${selectedAlignment === "brakmarien" ? "text-white" : "text-gray-400"}`}>
                  {ALIGNMENT_LABELS.brakmarien}
                </Text>
              </TouchableOpacity>
            </View>
            {availableOrders.length > 0 && (
              <View className="gap-1.5">
                <Text className="text-xs text-gray-500">Ordre (optionnel)</Text>
                <View className="flex-row flex-wrap gap-2">
                  {availableOrders.map((order) => (
                    <TouchableOpacity
                      key={order}
                      onPress={() => handleOrderChange(selectedOrder === order ? null : order)}
                      className={`px-3 py-1 rounded-full ${
                        selectedOrder === order
                          ? selectedAlignment === "bontarien" ? "bg-blue-600" : "bg-red-700"
                          : "bg-white/10"
                      }`}
                    >
                      <Text className={`text-xs font-medium ${selectedOrder === order ? "text-white" : "text-gray-400"}`}>
                        {ORDER_LABELS[order]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {hasJobVariant && (
          <View className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4 gap-3">
            <Text className="text-sm font-medium text-gray-300">Métier</Text>
            <View className="flex-row flex-wrap gap-2">
              <TouchableOpacity
                onPress={() => handleJobChange(selectedJob === "paysan" ? null : "paysan")}
                className={`px-3 py-1.5 rounded-full ${selectedJob === "paysan" ? "bg-yellow-600" : "bg-white/10"}`}
              >
                <Text className={`text-sm font-medium ${selectedJob === "paysan" ? "text-white" : "text-gray-400"}`}>
                  Paysan
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleJobChange(selectedJob === "alchimiste" ? null : "alchimiste")}
                className={`px-3 py-1.5 rounded-full ${selectedJob === "alchimiste" ? "bg-green-600" : "bg-white/10"}`}
              >
                <Text className={`text-sm font-medium ${selectedJob === "alchimiste" ? "text-white" : "text-gray-400"}`}>
                  Alchimiste
                </Text>
              </TouchableOpacity>
            </View>
            {!selectedJob && (
              <Text className="text-xs text-gray-500">Sélectionne ton métier pour voir les quêtes correspondantes.</Text>
            )}
          </View>
        )}

        {prerequisiteGroups.map(({ title, quests: groupQuests }) => (
          <QuestSection
            key={title}
            title={title}
            quests={groupQuests}
            dofusColor={dofus.color}
            onToggle={offlineHandleToggle}
            onBulkComplete={() => handleBulkComplete("prerequisite" as QuestSectionType, selectedJob)}
            onBulkUncomplete={() => handleBulkUncomplete("prerequisite" as QuestSectionType, selectedJob)}
          />
        ))}
        {mainQuestGroups.map(({ title, quests: groupQuests }) => (
          <QuestSection
            key={title}
            title={title}
            quests={groupQuests}
            dofusColor={dofus.color}
            onToggle={offlineHandleToggle}
            onBulkComplete={() => handleBulkComplete("main" as QuestSectionType, selectedJob)}
            onBulkUncomplete={() => handleBulkUncomplete("main" as QuestSectionType, selectedJob)}
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
