import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { Stack } from "expo-router";
import { BlurView } from "expo-blur";
import type { BottomSheetHandle } from "@/components/shared/CustomBottomSheet";
import { getDofusList, getAggregatedResourcesForDofus } from "@dofus-tracker/db";
import { ResourceBottomSheet } from "@/components/resources/ResourceBottomSheet";
import { supabase } from "@/lib/supabase";
import type { Dofus, AggregatedResource } from "@dofus-tracker/types";

interface DofusResources {
  dofus: Dofus;
  resources: AggregatedResource[];
}

export default function ResourcesScreen() {
  const [data, setData] = useState<DofusResources[]>([]);
  const [selected, setSelected] = useState<DofusResources | null>(null);
  const bottomSheetRef = useRef<BottomSheetHandle>(null);

  const loadData = useCallback(async () => {
    const allDofus = await getDofusList(supabase);
    const results = await Promise.all(
      allDofus.map(async (dofus) => ({
        dofus,
        resources: await getAggregatedResourcesForDofus(supabase, dofus.id),
      }))
    );
    setData(results.filter((r) => r.resources.length > 0));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function openSheet(item: DofusResources) {
    setSelected(item);
    bottomSheetRef.current?.expand();
  }

  return (
    <View className="flex-1 bg-dofus-dark">
      <Stack.Screen options={{ title: "Ressources" }} />
      <FlatList
        data={data}
        keyExtractor={(item) => item.dofus.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openSheet(item)} className="mb-3" activeOpacity={0.8}>
            <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden">
              <View
                className="flex-row items-center justify-between px-4 py-3"
                style={{ backgroundColor: "rgba(8,16,10,0.55)" }}
              >
                <View>
                  <Text className="text-white font-semibold">{item.dofus.name}</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">
                    {item.resources.filter((r) => !r.is_kamas).length} ressources
                  </Text>
                </View>
                <Text className="text-gray-500 text-lg">›</Text>
              </View>
            </BlurView>
          </TouchableOpacity>
        )}
      />

      {selected && (
        <ResourceBottomSheet
          ref={bottomSheetRef}
          resources={selected.resources}
          dofusColor={selected.dofus.color}
        />
      )}
    </View>
  );
}
